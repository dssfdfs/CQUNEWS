from pydantic import BaseSettings

class Settings(BaseSettings):
    VLLM_URL: str = "http://36.139.85.218:8081"
    API_KEY: str = "1234"
    DATABASE_URL: str = "sqlite:///intellgenthub.db"
    VLLM_MODEL = "/home/ma-user/AscendCloud/Qwen3-0.6B"  # 部署的模型名


settings = Settings()
