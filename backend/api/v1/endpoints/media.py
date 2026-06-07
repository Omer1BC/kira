from fastapi import APIRouter
from pydantic import BaseModel
from api.v1.endpoints.types import *

class ServerResponse(BaseModel):
    status: int
    data: Optional[str] = None

router = APIRouter()

@router.post("/upload-file", response_model=ServerResponse)
async def upload_file(request: FileRequest ):
    pass

