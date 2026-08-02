import logging
import re

SENSITIVE_PATTERNS = [
    r"(?i)\b(api[_-]?key|token|secret|authorization|password|passwd)\b",
    r"(?i)(?<![A-Za-z0-9._-])sk-[A-Za-z0-9]{4,}(?![A-Za-z0-9._-])",
    r"(?i)Bearer\s+[A-Za-z0-9._-]+",
]


def redact_sensitive_data(value: str) -> str:
    if not isinstance(value, str):
        return value

    redacted = value
    for pattern in SENSITIVE_PATTERNS:
        redacted = re.sub(pattern, "[REDACTED]", redacted)

    # Mask any remaining inline secret-looking values after the regex pass.
    redacted = re.sub(r"(?i)(\b(?:api[_-]?key|token|secret|authorization|password|passwd)\s*[:=]\s*)([^\s,;]+)", r"\1[REDACTED]", redacted)
    redacted = re.sub(r"(?i)\b(bearer)\s+([A-Za-z0-9._-]+)", r"\1 [REDACTED]", redacted)
    return redacted


def get_safe_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
