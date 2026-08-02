// Shared, client-safe error types + user-facing messages.

export const NO_SEARCH_PROVIDER_MESSAGE =
  "Live verification is unavailable because no search provider is configured.";

export const NO_AI_PROVIDER_MESSAGE =
  "Live verification is unavailable because no AI provider is configured.";

/** Thrown when a required backend service is not configured via environment variables. */
export class ConfigurationError extends Error {
  readonly code = "CONFIGURATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
