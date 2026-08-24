from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AiCoach Backend"
    env: str = "development"
    database_url: str = "postgresql+psycopg://aicoach:aicoach@localhost:5433/aicoach"

    jwt_secret_key: str = "dev-only-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
