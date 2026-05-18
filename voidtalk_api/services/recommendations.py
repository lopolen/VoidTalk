from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from voidtalk_api.core.recommendations_config import (
    RecommendationConfig,
    load_recommendation_config,
)
from voidtalk_api.models.user import User
from voidtalk_api.repositories.recommendations import (
    PostRecommendationCandidate,
    PostRecommendationRepository,
)


@dataclass(frozen=True)
class RecommendedPost:
    id: int
    user_id: int
    post_body: str
    created_at: datetime
    likes_count: int
    hashtags: list[str]
    recommendation_score: float


class PostRecommendationScorer:
    def __init__(self, config: RecommendationConfig):
        self.config = config

    def score(
        self,
        candidate: PostRecommendationCandidate,
        hashtag_affinities: dict[str, float],
    ) -> float:
        relevance_score = self._relevance_score(candidate, hashtag_affinities)
        popularity_score = self._popularity_score(candidate.likes_count)
        freshness_score = self._freshness_score(candidate.post.created_at)

        return relevance_score * popularity_score * freshness_score

    def _relevance_score(
        self,
        candidate: PostRecommendationCandidate,
        hashtag_affinities: dict[str, float],
    ) -> float:
        if not candidate.hashtags:
            return self.config.no_hashtag_score

        score = sum(
            hashtag_affinities.get(hashtag, 0.0)
            for hashtag in candidate.hashtags
        ) / len(candidate.hashtags)

        return max(score, self.config.exploration_score)

    def _popularity_score(self, likes_count: int) -> float:
        return 1 / ((likes_count + 1) ** self.config.popularity_penalty_power)

    def _freshness_score(self, created_at: datetime) -> float:
        half_life_days = self.config.freshness_half_life_days
        if half_life_days <= 0:
            return 1.0

        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        age_seconds = max(
            (datetime.now(timezone.utc) - created_at).total_seconds(),
            0,
        )
        age_days = age_seconds / 86400
        score = 0.5 ** (age_days / half_life_days)

        return max(score, self.config.min_freshness_score)


class PostRecommendationService:
    def __init__(self, db: Session):
        self.config = load_recommendation_config()
        self.recommendations = PostRecommendationRepository(db)
        self.scorer = PostRecommendationScorer(self.config)

    def list_recommendations(
        self,
        current_user: User,
        limit: int | None = None,
    ) -> list[RecommendedPost]:
        requested_limit = limit or self.config.default_limit
        safe_limit = max(1, min(requested_limit, self.config.max_limit))
        pool_limit = safe_limit * self.config.candidate_pool_multiplier

        hashtag_affinities = self._build_hashtag_affinities(current_user.id)
        candidates = self.recommendations.list_candidates(
            user_id=current_user.id,
            limit=pool_limit,
            exclude_own_posts=self.config.exclude_own_posts,
        )

        scored_posts = [
            self._to_recommended_post(
                candidate=candidate,
                score=self.scorer.score(candidate, hashtag_affinities),
            )
            for candidate in candidates
        ]

        scored_posts.sort(
            key=lambda post: (post.recommendation_score, post.created_at, post.id),
            reverse=True,
        )

        return scored_posts[:safe_limit]

    def _build_hashtag_affinities(self, user_id: int) -> dict[str, float]:
        affinities: dict[str, float] = {}

        for hashtag, count in self.recommendations.count_liked_hashtags(
            user_id
        ).items():
            affinities[hashtag] = (
                affinities.get(hashtag, 0.0)
                + count * self.config.liked_hashtag_weight
            )

        for hashtag, count in self.recommendations.count_authored_hashtags(
            user_id
        ).items():
            affinities[hashtag] = (
                affinities.get(hashtag, 0.0)
                + count * self.config.authored_hashtag_weight
            )

        return affinities

    def _to_recommended_post(
        self,
        candidate: PostRecommendationCandidate,
        score: float,
    ) -> RecommendedPost:
        return RecommendedPost(
            id=candidate.post.id,
            user_id=candidate.post.user_id,
            post_body=candidate.post.post_body,
            created_at=candidate.post.created_at,
            likes_count=candidate.likes_count,
            hashtags=candidate.hashtags,
            recommendation_score=round(score, 6),
        )
