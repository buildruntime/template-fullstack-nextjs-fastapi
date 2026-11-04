# Deployment

The template builds two container images, one for the API and one for the web application. Run them on any platform that runs containers, next to a managed PostgreSQL and, optionally, Redis. `compose.yaml` is for local development only.

```mermaid
flowchart LR
    U["Users"] -- HTTPS --> LB["Load balancer / reverse proxy<br/>TLS, client address, edge rate limits"]
    LB --> W["web containers<br/>Next.js, port 3000"]
    W -- "private network" --> A["api containers<br/>FastAPI, port 8000"]
    A --> P[("PostgreSQL")]
    A --> R[("Redis")]
    J["migrate job<br/>alembic upgrade head"] --> P
```

## Build the images

```bash
docker build -t registry.example.com/starter-api:"$(git rev-parse --short HEAD)" ./backend
docker build -t registry.example.com/starter-web:"$(git rev-parse --short HEAD)" ./frontend
```

Tag images with the commit, push them to your registry, and deploy by that tag, never by `latest`. Both images run as unprivileged users. The CI workflow builds both on every pull request, so a broken Dockerfile fails the build.

## Configure

### API

| Variable | Required | Notes |
| :-- | :-- | :-- |
| `APP_ENVIRONMENT` | Yes | `production`. Also turns off `/docs` and `/openapi.json` unless `APP_DOCS_ENABLED=true`. |
| `APP_DATABASE_URL` | Yes | `postgresql+asyncpg://user:password@host:5432/db`. Add `?ssl=require` (or stricter) for a database outside the private network. |
| `APP_REDIS_URL` | Recommended | Without it, sign-in attempts are not rate limited, and a warning is logged at start-up. |
| `APP_LOG_FORMAT` | No | `json` (default) for log collectors. |
| `APP_LOG_LEVEL` | No | `INFO` by default. |
| `APP_SESSION_TTL_HOURS` | No | Session lifetime, 168 (7 days) by default. |
| `APP_ALLOW_REGISTRATION` | No | `false` to close self-service sign-up. |
| `APP_LOGIN_ATTEMPTS_PER_WINDOW`, `APP_LOGIN_WINDOW_SECONDS` | No | 10 attempts per 15 minutes per email address by default. |
| `APP_DATABASE_POOL_SIZE` | No | Connections per API instance, 5 by default. Keep `instances × (pool size + 10 overflow)` well below the database's `max_connections`. |

### Web

| Variable | Required | Notes |
| :-- | :-- | :-- |
| `API_URL` | Yes | How the web containers reach the API, for example `http://api:8000` on the private network. Read on the server only. |
| `SESSION_COOKIE_SECURE` | No | `true` by default in production. Leave it on: production must be served over HTTPS. |

Keep secrets in your platform's secret store, never in images or in the repository.

## Deploy a new version

1. **Migrate.** Run the API image as a one-off job: `alembic upgrade head`. Migrations must work with the version still running, so add columns as nullable, create indexes concurrently, and drop things only in a later release. See the handbook's guidance on zero-downtime schema changes.
2. **Roll out the API**, then the web application. Replace instances gradually, and only send traffic to an instance once its health check passes.
3. **Check** error rates and latency for the first minutes.

| Service | Liveness | Readiness |
| :-- | :-- | :-- |
| API | `GET /health/live` | `GET /health/ready`: checks PostgreSQL, and Redis if configured. `503` when a dependency is down. |
| Web | `GET /api/health` | Same endpoint. It does not call the API, so an API outage does not restart the web containers. |

To roll back, deploy the previous image tags. That is safe as long as the migrations since then were backwards compatible.

## First administrator

Administrators are created from the command line, never through the API:

```bash
docker run --rm -it --env-file api.env registry.example.com/starter-api:TAG \
  python -m app.cli create-user --email you@your-domain.example --name "Your Name" --role admin
```

The command asks for the password. In automation, pipe it in with `--password-stdin`. After that, administrators manage roles in the Users page.

## Reverse proxy and TLS

- Terminate TLS at the load balancer and redirect HTTP to HTTPS. The web application already sends `Strict-Transport-Security`.
- Expose only the web application. The API needs no public address: the browser never calls it.
- If you do expose the API, for example for another client, put rate limiting by client address in front of it, and run Uvicorn with `--forwarded-allow-ips` set to the proxy's address so that the right address is logged.

## Scaling

- **Both services are stateless.** Sessions live in PostgreSQL and rate-limit counters in Redis, so any number of instances can run behind the load balancer.
- **PostgreSQL connections are the limit to watch** as instances are added. Put PgBouncer in front of the database if you run out.
- **Session look-ups are an indexed read** on every authenticated request, and a write at most once a minute per session.

## Operations

- **Expired sessions:** run `python -m app.cli prune-sessions` daily, for example as a scheduled job with the API image.
- **Logs:** the API writes JSON to standard output, with a request ID on every entry. Search by the `request_id` a user reports from an error page.
- **Backups:** PostgreSQL is the only state worth backing up. Test a restore. Redis needs no backup.
- **Dependencies:** Dependabot opens weekly pull requests for Python, npm, GitHub Actions and the Docker base images. Rebuild and redeploy regularly so that base image fixes reach production.

## Before going live

- [ ] HTTPS everywhere, with the API on a private network.
- [ ] `APP_ENVIRONMENT=production`, and secrets from the secret store.
- [ ] `APP_REDIS_URL` set, so that sign-in is rate limited.
- [ ] Registration closed with `APP_ALLOW_REGISTRATION=false`, if accounts should only be created by administrators.
- [ ] The first administrator created with the CLI.
- [ ] `prune-sessions` scheduled, and database backups tested.
- [ ] A Content Security Policy added and tested. Next.js needs a nonce per request for its inline scripts; follow the Next.js guide on Content Security Policy.
- [ ] The Buildruntime branding replaced: `frontend/public/brand/`, `frontend/app/icon.svg`, the tokens in `frontend/app/globals.css`, and the page metadata in `frontend/app/layout.tsx`.
