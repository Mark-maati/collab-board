from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import Task, Board, User
from ..schemas import TaskCreate, TaskUpdate, TaskResponse
from ..websocket_manager import manager
from ..auth import get_current_user
from ..constants import WSEventTypes

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def verify_board_access(board_id: int, db: AsyncSession, user: User) -> Board:
    """Verify user has access to the board."""
    result = await db.execute(
        select(Board).options(selectinload(Board.members)).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()
    
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    is_owner = board.owner_id == user.id
    is_member = user in board.members
    is_public = board.is_public
    
    if not (is_owner or is_member or is_public):
        raise HTTPException(status_code=403, detail="You don't have access to this board")
    
    return board


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_board_access(task.board_id, db, current_user)
    
    db_task = Task(**task.model_dump())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    
    # Broadcast to all connected clients
    await manager.broadcast(
        task.board_id,
        {
            "type": WSEventTypes.TASK_CREATED,
            "payload": TaskResponse.model_validate(db_task).model_dump(mode="json"),
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return db_task


@router.get("/board/{board_id}", response_model=List[TaskResponse])
async def get_tasks_by_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_board_access(board_id, db, current_user)
    
    result = await db.execute(
        select(Task).where(Task.board_id == board_id).order_by(Task.position)
    )
    return result.scalars().all()


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int, 
    task_update: TaskUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    db_task = result.scalar_one_or_none()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await verify_board_access(db_task.board_id, db, current_user)
    
    update_data = task_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    await db.commit()
    await db.refresh(db_task)
    
    # Determine event type
    event_type = WSEventTypes.TASK_MOVED if "status" in update_data else WSEventTypes.TASK_UPDATED
    
    await manager.broadcast(
        db_task.board_id,
        {
            "type": event_type,
            "payload": TaskResponse.model_validate(db_task).model_dump(mode="json"),
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return db_task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    db_task = result.scalar_one_or_none()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await verify_board_access(db_task.board_id, db, current_user)
    
    board_id = db_task.board_id
    
    await db.delete(db_task)
    await db.commit()
    
    await manager.broadcast(
        board_id,
        {
            "type": WSEventTypes.TASK_DELETED,
            "payload": {"id": task_id},
            "timestamp": datetime.utcnow().isoformat()
        }
    )
