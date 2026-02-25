from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Task Schemas
class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    status: TaskStatus = TaskStatus.TODO
    assigned_to: Optional[str] = Field(None, max_length=255)


class TaskCreate(TaskBase):
    board_id: int
    position: Optional[int] = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    status: Optional[TaskStatus] = None
    position: Optional[int] = None
    assigned_to: Optional[str] = Field(None, max_length=255)


class TaskResponse(TaskBase):
    id: int
    board_id: int
    position: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Board Schemas
class BoardBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    is_public: bool = False


class BoardCreate(BoardBase):
    pass


class BoardUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    is_public: Optional[bool] = None


class BoardResponse(BoardBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    tasks: List[TaskResponse] = []

    class Config:
        from_attributes = True


# WebSocket Event Schemas
class WSEventType(str, Enum):
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_DELETED = "task_deleted"
    TASK_MOVED = "task_moved"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CURSOR_MOVE = "cursor_move"


class WSMessage(BaseModel):
    type: str
    payload: dict = {}


class WSEvent(BaseModel):
    type: WSEventType
    payload: dict
    user_id: Optional[str] = None
    timestamp: datetime = datetime.utcnow()
