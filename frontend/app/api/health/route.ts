/** Liveness for the container platform. It does not call the API, so an API outage does not restart the frontend. */
export function GET() {
  return Response.json({ status: "ok" });
}
