from pydantic import BaseSettings

class Settings(BaseSettings):
    VLLM_URL: str = "http://xxx.xxx.xxx.xxx:8081"
    API_KEY: str = "1234"
    DATABASE_URL: str = "sqlite:///intelligenthub.db"
    VLLM_MODEL = "/home/ma-user/AscendCloud/Qwen3-0.6B"  # 部署的模型名
    MOCK_MODE: bool = True  # Mock模式：不调用真实vLLM服务，使用模拟数据


settings = Settings()
