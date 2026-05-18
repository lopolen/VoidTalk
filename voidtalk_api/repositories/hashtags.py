from sqlalchemy import select
from sqlalchemy.orm import Session

from voidtalk_api.models.post import Hashtag, PostHashtag


class HashtagRepository:
    def __init__(self, db: Session):
        self.db = db

    def attach_to_post(self, post_id: int, names: list[str]) -> None:
        if not names:
            return

        existing_hashtags = list(
            self.db.scalars(select(Hashtag).where(Hashtag.name.in_(names)))
        )
        hashtags_by_name = {hashtag.name: hashtag for hashtag in existing_hashtags}

        for name in names:
            if name in hashtags_by_name:
                continue

            hashtag = Hashtag(name=name)
            self.db.add(hashtag)
            hashtags_by_name[name] = hashtag

        self.db.flush()

        for name in names:
            self.db.add(
                PostHashtag(
                    post_id=post_id,
                    hashtag_id=hashtags_by_name[name].id,
                )
            )

        self.db.commit()

    def list_by_post_ids(self, post_ids: list[int]) -> dict[int, list[str]]:
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
