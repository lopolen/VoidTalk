from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from voidtalk_api.models.post import Hashtag, Post, PostHashtag, PostUserLike


@dataclass(frozen=True)
class PostRecommendationCandidate:
    post: Post
    likes_count: int
    hashtags: list[str]


class PostRecommendationRepository:
    def __init__(self, db: Session):
        self.db = db

    def count_liked_hashtags(self, user_id: int) -> dict[str, int]:
        rows = self.db.execute(
            select(Hashtag.name, func.count())
            .join(PostHashtag, PostHashtag.hashtag_id == Hashtag.id)
            .join(PostUserLike, PostUserLike.post_id == PostHashtag.post_id)
            .where(PostUserLike.user_id == user_id)
            .group_by(Hashtag.name)
        )

        return {name: count for name, count in rows}

    def count_authored_hashtags(self, user_id: int) -> dict[str, int]:
        rows = self.db.execute(
            select(Hashtag.name, func.count())
            .join(PostHashtag, PostHashtag.hashtag_id == Hashtag.id)
            .join(Post, Post.id == PostHashtag.post_id)
            .where(Post.user_id == user_id)
            .group_by(Hashtag.name)
        )

        return {name: count for name, count in rows}

    def list_candidates(
        self,
        user_id: int,
        limit: int,
        exclude_own_posts: bool,
    ) -> list[PostRecommendationCandidate]:
        liked_post_ids = select(PostUserLike.post_id).where(
            PostUserLike.user_id == user_id
        )

        stmt = (
            select(Post, func.count(PostUserLike.user_id).label("likes_count"))
            .outerjoin(PostUserLike, PostUserLike.post_id == Post.id)
            .where(Post.id.not_in(liked_post_ids))
            .group_by(Post.id)
            .order_by(Post.created_at.desc(), Post.id.desc())
            .limit(limit)
        )

        if exclude_own_posts:
            stmt = stmt.where(Post.user_id != user_id)

        rows = self.db.execute(stmt).all()
        posts = [post for post, _likes_count in rows]
        hashtags_by_post_id = self._list_hashtags_by_post_id(
            [post.id for post in posts]
        )

        return [
            PostRecommendationCandidate(
                post=post,
                likes_count=likes_count,
                hashtags=hashtags_by_post_id.get(post.id, []),
            )
            for post, likes_count in rows
        ]

    def _list_hashtags_by_post_id(self, post_ids: list[int]) -> dict[int, list[str]]:
        if not post_ids:
            return {}

        rows = self.db.execute(
            select(PostHashtag.post_id, Hashtag.name)
            .join(Hashtag, Hashtag.id == PostHashtag.hashtag_id)
            .where(PostHashtag.post_id.in_(post_ids))
            .order_by(Hashtag.name.asc())
        )

        hashtags_by_post_id: dict[int, list[str]] = {}
        for post_id, hashtag_name in rows:
            hashtags_by_post_id.setdefault(post_id, []).append(hashtag_name)

        return hashtags_by_post_id
