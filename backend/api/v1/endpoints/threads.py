from fastapi import APIRouter
from api.v1.endpoints.types import *
from agent import agent
from langchain_core.messages import AIMessage, ToolMessage

router = APIRouter()


@router.post("/{id}/runs/prompt", response_model=ServerResponse)
async def runs_prompt(id: str, request: PromptRequest):
    payload = {
        "config": {"configurable": {"thread_id": id}},
        "data": request.data,
    }
    result = agent.get_response(payload)
    return ServerResponse(status=200, data={"responses": serialize(result)})


@router.post("/{id}/tools", response_model=ServerResponse)
async def runs_tools(id: str, request: HILRequest):
    payload = {"config": {"configurable": {"thread_id": id}}}
    if request.action:
        result = agent.resume_with_approved_tools(payload)
    else:
        result = agent.resume_with_declined_tools(payload)
    return ServerResponse(status=200, data={"responses": serialize(result)})


@router.get("/{id}/runs/clear", response_model=ServerResponse)
async def runs_clear(id: str):
    await agent.clear_history(id)
    return ServerResponse(status=200)


def serialize(responses) -> list:
    res = []
    for resp in responses:
        if isinstance(resp, AIMessage):
            res.append(AIResponse(
                responseType="assistant",
                data=resp.content,
                toolCalls=[ToolCall(id=t["id"], name=t["name"], args=t["args"]) for t in resp.tool_calls],
            ))
        elif isinstance(resp, ToolMessage):
            res.append(ToolResponse(responseType="tool", data=resp.content, name=resp.name))
    return res
