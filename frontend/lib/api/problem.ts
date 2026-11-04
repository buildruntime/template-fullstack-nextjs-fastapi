/** Problem Details (RFC 9457) responses from the API, as a typed error. */

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  request_id?: string;
  errors?: { location: string; message: string }[];
};

export class ApiError extends Error {
  constructor(
    readonly problem: ProblemDetails,
    readonly retryAfter?: number,
  ) {
    super(problem.detail);
    this.name = "ApiError";
  }

  get code(): string {
    return this.problem.code;
  }

  get status(): number {
    return this.problem.status;
  }

  /** The message for one request field, such as "body.email". */
  fieldError(location: string): string | undefined {
    return this.problem.errors?.find((error) => error.location === location)?.message;
  }
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ProblemDetails).status === "number" &&
    typeof (value as ProblemDetails).code === "string" &&
    typeof (value as ProblemDetails).detail === "string"
  );
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const retryAfter = Number(response.headers.get("retry-after")) || undefined;
  if (isProblemDetails(body)) return new ApiError(body, retryAfter);
  return new ApiError({
    type: "about:blank",
    title: response.statusText,
    status: response.status,
    detail: "The server returned an unexpected response.",
    code: "unexpected_response",
  });
}
