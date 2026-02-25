"""Constants for the application."""


class WSEventTypes:
    """WebSocket event type constants."""
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_DELETED = "task_deleted"
    TASK_MOVED = "task_moved"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CURSOR_MOVE = "cursor_move"
    CONNECTION_ESTABLISHED = "connection_established"
    ERROR = "error"


class WSMessageTypes:
    """WebSocket incoming message type constants."""
    CURSOR_MOVE = "cursor_move"
    PING = "ping"


class ErrorMessages:
    """Error message constants."""
    BOARD_NOT_FOUND = "Board not found"
    TASK_NOT_FOUND = "Task not found"
    USER_NOT_FOUND = "User not found"
    ACCESS_DENIED = "You don't have access to this resource"
    INVALID_CREDENTIALS = "Invalid credentials"
    CONNECTION_LIMIT_EXCEEDED = "Connection limit exceeded"
