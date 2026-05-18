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
