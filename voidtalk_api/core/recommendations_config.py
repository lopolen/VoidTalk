from dataclasses import dataclass
import os

from dotenv import load_dotenv


RECOMMENDATIONS_ENV_PATH = "voidtalk_api/cfg/recommendations.env"


@dataclass(frozen=True)
class RecommendationConfig:
    default_limit: int
    max_limit: int
    candidate_pool_multiplier: int
    liked_hashtag_weight: float
    authored_hashtag_weight: float
    exploration_score: float
    no_hashtag_score: float
    popularity_penalty_power: float
    freshness_half_life_days: float
    min_freshness_score: float
    exclude_own_posts: bool


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    return int(value)


def _get_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    return float(value)


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load_recommendation_config() -> RecommendationConfig:
    load_dotenv(RECOMMENDATIONS_ENV_PATH)

    return RecommendationConfig(
        default_limit=_get_int("RECOMMENDATIONS_DEFAULT_LIMIT", 20),
        max_limit=_get_int("RECOMMENDATIONS_MAX_LIMIT", 100),
        candidate_pool_multiplier=_get_int(
            "RECOMMENDATIONS_CANDIDATE_POOL_MULTIPLIER",
            8,
        ),
        liked_hashtag_weight=_get_float("RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT", 3.0),
        authored_hashtag_weight=_get_float(
            "RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT",
            1.5,
        ),
        exploration_score=_get_float("RECOMMENDATIONS_EXPLORATION_SCORE", 0.2),
        no_hashtag_score=_get_float("RECOMMENDATIONS_NO_HASHTAG_SCORE", 0.05),
        popularity_penalty_power=_get_float(
            "RECOMMENDATIONS_POPULARITY_PENALTY_POWER",
            1.2,
        ),
        freshness_half_life_days=_get_float(
            "RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS",
            21.0,
        ),
        min_freshness_score=_get_float("RECOMMENDATIONS_MIN_FRESHNESS_SCORE", 0.25),
        exclude_own_posts=_get_bool("RECOMMENDATIONS_EXCLUDE_OWN_POSTS", True),
    )
