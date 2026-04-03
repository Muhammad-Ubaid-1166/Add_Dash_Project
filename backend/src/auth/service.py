from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import User
from .schemas import UserCreateModel
from .utils import generate_passwd_hash


class UserService:
    async def get_user_by_email(self, email: str, session: AsyncSession) -> User | None:
        """
        Fetch a user by email.
        Returns User object if found, else None.
        """
        statement = select(User).where(User.email == email)
        result = await session.execute(statement)
        user = result.scalars().first()
        return user

    async def user_exists(self, email: str, session: AsyncSession) -> bool:
        """
        Check if a user with the given email exists.
        """
        user = await self.get_user_by_email(email, session)
        return user is not None

    async def create_user(self, user_data: UserCreateModel, session: AsyncSession) -> User:
        """
        Create a new user with hashed password.
        Truncates password to 72 bytes for bcrypt safety.
        """
        user_data_dict = user_data.model_dump()

        password = user_data_dict.get("password")
        if not password:
            raise ValueError("Password cannot be empty.")

        # Truncate to 72 bytes for bcrypt
        password = password[:72]

        new_user = User(**user_data_dict)
        new_user.password_hash = generate_passwd_hash(password)
        new_user.role = "user"

        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)  # ensure ID & fields are updated

        return new_user

    async def update_user(self, user: User, user_data: dict, session: AsyncSession) -> User:
        """
        Update user fields. Automatically hashes password if provided.
        """
        for k, v in user_data.items():
            if k == "password" and v:  # handle password safely
                v = generate_passwd_hash(v[:72])  # truncate to 72 bytes
                k = "password_hash"
            setattr(user, k, v)

        session.add(user)
        await session.commit()
        await session.refresh(user)

        return user

        