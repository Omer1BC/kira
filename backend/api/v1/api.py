from fastapi import APIRouter
from .endpoints import threads

v1 = APIRouter()
v1.include_router(threads.router, prefix="/threads")
