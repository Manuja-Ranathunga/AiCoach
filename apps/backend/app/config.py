from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AiCoach Backend"
    env: str = "development"
    database_url: str = "postgresql+psycopg://aicoach:aicoach@localhost:5433/aicoach"

    class Config:
        env_file = ".env"


settings = Settings()
