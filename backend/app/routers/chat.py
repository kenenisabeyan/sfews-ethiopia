from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..services.agent.orchestrator import run_agent
from ..security import get_current_user
from .. import models

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

@router.post("/ask", response_model=ChatResponse)
async def ask_agent(request: ChatRequest, current_user: models.User = Depends(get_current_user)):
    """
    Single-shot chat endpoint.
    Takes a natural language query, orchestrates LLM tools to gather live data, and returns a situational report.
    """
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    try:
        final_answer = await run_agent(request.query)
        return ChatResponse(response=final_answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
