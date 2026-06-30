from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth_router import router as auth_router
from app.routes.history_router import router as history_router

app = FastAPI(title="CQUNEWS History API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(history_router)