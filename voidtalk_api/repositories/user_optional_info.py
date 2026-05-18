from sqlalchemy.orm import Session

from voidtalk_api.models.user import UserOptionalInfo


class UserOptionalInfoRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_default(self, user_id: int) -> UserOptionalInfo:
        optional_info = UserOptionalInfo(user_id=user_id)

        self.db.add(optional_info)
        self.db.commit()
        self.db.refresh(optional_info)
        return optional_info

    def get_by_user_id(self, user_id: int) -> UserOptionalInfo | None:
        return self.db.get(UserOptionalInfo, user_id)

    def replace(
        self,
        optional_info: UserOptionalInfo,
        account_description: str | None,
        first_icon_color: str,
        second_icon_color: str,
        icon_id: int,
    ) -> UserOptionalInfo:
        optional_info.account_description = account_description
        optional_info.first_icon_color = first_icon_color
        optional_info.second_icon_color = second_icon_color
        optional_info.icon_id = icon_id

        self.db.commit()
        self.db.refresh(optional_info)
        return optional_info
