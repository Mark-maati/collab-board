from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from .config import get_settings
from .database import init_db
from .websocket_manager import manager
from .routers import boards, tasks, auth
from .constants import WSEventTypes, WSMessageTypes
from .auth import decode_token

settings = get_settings()
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Real-Time Collaboration API",
    description="A real-time task board collaboration application",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware with specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if not settings.debug:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(boards.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")


@app.websocket("/ws/{board_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    board_id: int,
    token: str = Query(...)
):
    # Validate JWT token
    payload = decode_token(token)
    if payload is None:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return
    
    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token payload")
        return
    
    # TODO: Verify user has access to this board
    # For now, we allow any authenticated user
    
    # Try to connect (checks connection limits)
    connected = await manager.connect(websocket, board_id, user_id)
    if not connected:
        return
    
    try:
        # Send current active users to the new connection
        await websocket.send_json({
            "type": WSEventTypes.CONNECTION_ESTABLISHED,
            "payload": {
                "active_users": manager.get_active_users(board_id),
                "cursors": manager.user_cursors.get(board_id, {})
            }
        })
        
        while True:
            data = await websocket.receive_text()
            
            # Validate message
            message = manager.validate_message(data)
            if message is None:
                await websocket.send_json({
                    "type": WSEventTypes.ERROR,
                    "payload": {"message": "Invalid message format"}
                })
                continue
            
            # Handle cursor movements
            if message.type == WSMessageTypes.CURSOR_MOVE:
                await manager.broadcast_cursor(
                    board_id, 
                    user_id, 
                    message.payload
                )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, board_id, user_id)
        await manager.broadcast(
            board_id,
            {
                "type": WSEventTypes.USER_LEFT,
                "payload": {
                    "user_id": user_id,
                    "active_users": manager.get_active_users(board_id)
                }
            }
        )
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, board_id, user_id)


@app.get("/health")
@limiter.limit("10/minute")
async def health_check(request: Request):
    return {"status": "healthy"}
