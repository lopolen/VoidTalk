from sqlalchemy.orm import Session

from voidtalk_api.models.user import User, UserOptionalInfo
from voidtalk_api.repositories.user_optional_info import UserOptionalInfoRepository
from voidtalk_api.schemas.user import UserOptionalInfoReplace


class UserOptionalInfoService:
    def __init__(self, db: Session):
        self.optional_info = UserOptionalInfoRepository(db)

    def get_current_user_optional_info(self, current_user: User) -> UserOptionalInfo:
        optional_info = self.optional_info.get_by_user_id(current_user.id)
        if optional_info is None:
            return self.optional_info.create_default(current_user.id)

        return optional_info

    def replace_current_user_optional_info(
        self,
        optional_info_data: UserOptionalInfoReplace,
        current_user: User,
    ) -> UserOptionalInfo:
        optional_info = self.optional_info.get_by_user_id(current_user.id)
        if optional_info is None:
            optional_info = self.optional_info.create_default(current_user.id)

        return self.optional_info.replace(
            optional_info=optional_info,
            account_description=optional_info_data.account_description,
            first_icon_color=optional_info_data.first_icon_color,
            second_icon_color=optional_info_data.second_icon_color,
            icon_id=optional_info_data.icon_id,
        )
