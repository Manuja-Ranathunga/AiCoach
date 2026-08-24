from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AiCoach Backend"
    env: str = "development"


settings = Settings()
