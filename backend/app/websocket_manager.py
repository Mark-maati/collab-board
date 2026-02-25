from fastapi import WebSocket
from typing import Dict, Set, Optional
from datetime import datetime
from pydantic import ValidationError

from .config import get_settings
from .constants import WSEventTypes
from .schemas import WSMessage

settings = get_settings()


class ConnectionManager:
    def __init__(self):
        # board_id -> set of (websocket, user_id)
        self.active_connections: Dict[int, Set[tuple]] = {}
        self.user_cursors: Dict[int, Dict[str, dict]] = {}  # board_id -> user_id -> cursor_pos
        self.user_connection_count: Dict[str, int] = {}  # user_id -> connection count

    def _check_connection_limits(self, board_id: int, user_id: str) -> Optional[str]:
        """Check if connection limits are exceeded. Returns error message or None."""
        # Check per-user limit
        current_user_connections = self.user_connection_count.get(user_id, 0)
        if current_user_connections >= settings.max_connections_per_user:
            return f"Maximum connections per user ({settings.max_connections_per_user}) exceeded"
        
        # Check per-board limit
        if board_id in self.active_connections:
            if len(self.active_connections[board_id]) >= settings.max_connections_per_board:
                return f"Maximum connections per board ({settings.max_connections_per_board}) exceeded"
        
        return None

    async def connect(self, websocket: WebSocket, board_id: int, user_id: str) -> bool:
        """Connect a websocket. Returns False if connection limits exceeded."""
        # Check limits before accepting
        limit_error = self._check_connection_limits(board_id, user_id)
        if limit_error:
            await websocket.close(code=1008, reason=limit_error)
            return False
        
        await websocket.accept()
        
        if board_id not in self.active_connections:
            self.active_connections[board_id] = set()
            self.user_cursors[board_id] = {}
        
        self.active_connections[board_id].add((websocket, user_id))
        self.user_connection_count[user_id] = self.user_connection_count.get(user_id, 0) + 1
        
        # Notify others that user joined
        await self.broadcast(
            board_id,
            {
                "type": WSEventTypes.USER_JOINED,
                "payload": {
                    "user_id": user_id,
                    "active_users": self.get_active_users(board_id)
                },
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_websocket=websocket
        )
        
        return True

    def disconnect(self, websocket: WebSocket, board_id: int, user_id: str):
        if board_id in self.active_connections:
            self.active_connections[board_id].discard((websocket, user_id))
            
            # Decrement user connection count
            if user_id in self.user_connection_count:
                self.user_connection_count[user_id] -= 1
                if self.user_connection_count[user_id] <= 0:
                    del self.user_connection_count[user_id]
            
            if user_id in self.user_cursors.get(board_id, {}):
                del self.user_cursors[board_id][user_id]
            
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]
                if board_id in self.user_cursors:
                    del self.user_cursors[board_id]

    def get_active_users(self, board_id: int) -> list:
        if board_id not in self.active_connections:
            return []
        return list(set(user_id for _, user_id in self.active_connections[board_id]))

    async def broadcast(
        self, 
        board_id: int, 
        message: dict, 
        exclude_websocket: WebSocket = None
    ):
        if board_id not in self.active_connections:
            return
        
        dead_connections = set()
        
        for websocket, user_id in self.active_connections[board_id]:
            if websocket == exclude_websocket:
                continue
            try:
                await websocket.send_json(message)
            except Exception:
                dead_connections.add((websocket, user_id))
        
        # Clean up dead connections
        for conn in dead_connections:
            websocket, user_id = conn
            self.active_connections[board_id].discard(conn)
            if user_id in self.user_connection_count:
                self.user_connection_count[user_id] -= 1
                if self.user_connection_count[user_id] <= 0:
                    del self.user_connection_count[user_id]

    async def broadcast_cursor(self, board_id: int, user_id: str, cursor_data: dict):
        self.user_cursors.setdefault(board_id, {})[user_id] = cursor_data
        
        await self.broadcast(
            board_id,
            {
                "type": WSEventTypes.CURSOR_MOVE,
                "payload": {
                    "user_id": user_id,
                    "cursor": cursor_data
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    def validate_message(self, data: str) -> Optional[WSMessage]:
        """Validate incoming WebSocket message."""
        try:
            import json
            parsed = json.loads(data)
            return WSMessage.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError):
            return None


manager = ConnectionManager()
