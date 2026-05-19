import re
from dataclasses import dataclass
from datetime import timedelta


@dataclass(frozen=True)
class PostAntiSpamLimits:
    min_length: int = 3
    max_length: int = 1000
    cooldown: timedelta = timedelta(seconds=30)
    short_window: timedelta = timedelta(minutes=10)
    short_window_max_posts: int = 10
    daily_window: timedelta = timedelta(days=1)
    daily_window_max_posts: int = 50
    encoded_sequence_min_count: int = 8
    encoded_sequence_max_share: float = 0.20


POST_ANTISPAM_LIMITS = PostAntiSpamLimits()

PERCENT_ENCODED_SEQUENCE_RE = re.compile(r"%[0-9A-Fa-f]{2}")


def has_excessive_percent_encoding(
    text: str,
    limits: PostAntiSpamLimits = POST_ANTISPAM_LIMITS,
) -> bool:
    encoded_sequences = PERCENT_ENCODED_SEQUENCE_RE.findall(text)
    if len(encoded_sequences) < limits.encoded_sequence_min_count:
        return False

    encoded_chars = len(encoded_sequences) * 3
    return encoded_chars / max(len(text), 1) > limits.encoded_sequence_max_share
