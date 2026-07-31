"""
url_checker.py

URL Risk Analyzer

Analyzes URLs found inside investment messages and estimates
their likelihood of being malicious or deceptive.

This module is intentionally lightweight and offline so it
works during hackathons without external APIs.

Future integrations:
- Google Safe Browsing
- VirusTotal
- PhishTank
- SEBI blacklist
"""

from urllib.parse import urlparse
import ipaddress

from .utils import extract_urls, get_domain, is_shortened_url

# ---------------------------------------------------------
# Suspicious TLDs
# ---------------------------------------------------------

SUSPICIOUS_TLDS = {
    ".xyz",
    ".top",
    ".click",
    ".live",
    ".buzz",
    ".loan",
    ".work",
    ".monster",
    ".fit",
    ".rest",
}

# ---------------------------------------------------------
# Suspicious Keywords
# ---------------------------------------------------------

SUSPICIOUS_KEYWORDS = {
    "login",
    "verify",
    "wallet",
    "crypto",
    "bonus",
    "reward",
    "claim",
    "gift",
    "offer",
    "investment",
    "profit",
    "double",
    "bank",
    "kyc",
}

# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def is_ip_address(domain: str) -> bool:
    """
    Check if the URL uses a raw IP address.
    """

    try:
        ipaddress.ip_address(domain)
        return True
    except ValueError:
        return False


def has_https(url: str) -> bool:
    """
    Check if HTTPS is used.
    """

    return url.lower().startswith("https://")


# ---------------------------------------------------------
# Main Analyzer
# ---------------------------------------------------------

def analyze_urls(text: str) -> dict:
    """
    Analyze all URLs inside a message.

    Returns
    -------
    {
        score,
        confidence,
        urls,
        findings
    }
    """

    urls = extract_urls(text)

    if not urls:

        return {
            "score": 0,
            "confidence": 100,
            "urls": [],
            "findings": ["No URL detected"]
        }

    score = 0
    findings = []

    for url in urls:

        domain = get_domain(url)

        if not domain:
            continue

        # -------------------------------------------------

        if is_shortened_url(url):

            score += 25

            findings.append(
                f"Shortened URL ({domain})"
            )

        # -------------------------------------------------

        if not has_https(url):

            score += 10

            findings.append(
                "Uses HTTP instead of HTTPS"
            )

        # -------------------------------------------------

        if is_ip_address(domain):

            score += 30

            findings.append(
                "Uses IP address instead of domain"
            )

        # -------------------------------------------------

        if len(domain) > 35:

            score += 10

            findings.append(
                "Very long domain name"
            )

        # -------------------------------------------------

        for tld in SUSPICIOUS_TLDS:

            if domain.endswith(tld):

                score += 15

                findings.append(
                    f"Suspicious TLD ({tld})"
                )

                break

        # -------------------------------------------------

        lower = url.lower()

        matched = []

        for keyword in SUSPICIOUS_KEYWORDS:

            if keyword in lower:

                matched.append(keyword)

        if matched:

            score += min(len(matched) * 5, 20)

            findings.append(
                "Suspicious URL keywords: "
                + ", ".join(matched)
            )

    # ---------------------------------------------------------
    # Multiple URLs
    # ---------------------------------------------------------

    if len(urls) >= 3:

        score += 10

        findings.append(
            "Contains multiple URLs"
        )

    score = min(score, 100)

    # ---------------------------------------------------------
    # Confidence
    # ---------------------------------------------------------

    if score >= 70:
        confidence = 95

    elif score >= 40:
        confidence = 85

    elif score >= 20:
        confidence = 75

    else:
        confidence = 60

    # ---------------------------------------------------------

    return {

        "score": score,

        "confidence": confidence,

        "urls": urls,

        "findings": findings
    }