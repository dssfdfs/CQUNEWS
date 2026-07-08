import asyncio
import httpx

async def test_model(name):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                'http://localhost:8000/api/test-api',
                json={'model': name, 'content': '测试', 'summaryType': '标准摘要', 'language': '中文'}
            )
            print(f"{name}: {response.json()}")
    except Exception as e:
        print(f"{name}: Error - {e}")

async def main():
    models = ['DeepSeek', '豆包', '文心一言', 'Kimi', '千问']
    for model in models:
        await test_model(model)

if __name__ == '__main__':
    asyncio.run(main())
