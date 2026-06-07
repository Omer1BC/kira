from pydantic import BaseModel
from typing import Optional, Dict, Any

# types
class UserMetadata(BaseModel):
    user: str
    timestamp: int


class PromptRequest(BaseModel):
    data: str
    metadata: Optional[UserMetadata] = None

class FileRequest(BaseModel):
    fileName: str
    data: str
    metadata: Optional[UserMetadata] = None

class ToolCall(BaseModel):
    id : str
    name: str
    args : Dict[str,Any]

class Response(BaseModel):
    responseType: str
    data : str
class ToolResponse(Response):
    name: str
class AIResponse(Response):
    toolCalls : Optional[list[ToolCall]] = []

class HILRequest(BaseModel):
    action: bool

class ToolResultRequest(BaseModel):
    id: str
    result: str

class ServerResponse(BaseModel):
    status: int
    data: Optional[Dict[str,Any]] = {}