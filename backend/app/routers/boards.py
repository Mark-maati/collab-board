from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List

from ..database import get_db
from ..models import Board, User
from ..schemas import BoardCreate, BoardResponse, BoardUpdate
from ..auth import get_current_user

router = APIRouter(prefix="/boards", tags=["boards"])


async def get_board_with_access(
    board_id: int,
    db: AsyncSession,
    user: User,
    require_owner: bool = False
) -> Board:
    """Get board and verify user has access."""
    result = await db.execute(
        select(Board).options(selectinload(Board.tasks)).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()
    
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Check access
    is_owner = board.owner_id == user.id
    is_member = user in board.members
    is_public = board.is_public
    
    if require_owner and not is_owner:
        raise HTTPException(status_code=403, detail="Only board owner can perform this action")
    
    if not (is_owner or is_member or is_public):
        raise HTTPException(status_code=403, detail="You don't have access to this board")
    
    return board


@router.post("/", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def create_board(
    board: BoardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_board = Board(**board.model_dump(), owner_id=current_user.id)
    db.add(db_board)
    await db.commit()
    await db.refresh(db_board)
    return db_board


@router.get("/", response_model=List[BoardResponse])
async def get_boards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get boards owned by user, member of, or public
    result = await db.execute(
        select(Board)
        .options(selectinload(Board.tasks))
        .where(
            or_(
                Board.owner_id == current_user.id,
                Board.members.contains(current_user),
                Board.is_public == True
            )
        )
        .order_by(Board.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{board_id}", response_model=BoardResponse)
async def get_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_board_with_access(board_id, db, current_user)


@router.patch("/{board_id}", response_model=BoardResponse)
async def update_board(
    board_id: int,
    board_update: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    board = await get_board_with_access(board_id, db, current_user, require_owner=True)
    
    update_data = board_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(board, field, value)
    
    await db.commit()
    await db.refresh(board)
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    board = await get_board_with_access(board_id, db, current_user, require_owner=True)
    await db.delete(board)
    await db.commit()
