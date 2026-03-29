from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Normalise all error responses to {detail, status_code, [errors]}."""
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "status_code": response.status_code,
            "detail": response.data.get("detail", str(exc)) if isinstance(response.data, dict) else str(exc),
        }
        # Preserve field-level validation errors
        if isinstance(response.data, dict) and len(response.data) > 1:
            errors = {k: v for k, v in response.data.items() if k != "detail"}
            if errors:
                error_data["errors"] = errors

        response.data = error_data

    return response


class ServiceUnavailableError(Exception):
    """Raised when a third-party service (Anthropic, Twitter) is unavailable."""
    pass


class RateLimitExceeded(Exception):
    """Raised when an external API rate limit is hit."""
    pass


class WalletVerificationError(Exception):
    """Raised when SIWE wallet verification fails."""
    pass
