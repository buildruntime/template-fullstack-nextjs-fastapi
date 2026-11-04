/** Fail fast, with instructions, if the stack the tests need is not there. */
export default async function globalSetup() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl)
    throw new Error("Set API_URL to the running API, for example http://localhost:8000.");
  if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) {
    throw new Error(
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to an admin account. Create one with:\n" +
        "  python -m app.cli create-user --email ... --name ... --role admin",
    );
  }
  const response = await fetch(new URL("/health/ready", apiUrl)).catch(() => null);
  if (!response?.ok) throw new Error(`The API at ${apiUrl} is not ready.`);
}
