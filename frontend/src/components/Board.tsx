import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { Task, TaskStatus, Board as BoardType, WSEvent } from '../types';
import { Column } from './Column';
import { AddTaskModal } from './AddTaskModal';
import { ActiveUsers } from './ActiveUsers';
import { useWebSocket } from '../hooks/useWebSocket';
import { Wifi, WifiOff } from 'lucide-react';
import { api } from '../api';

interface BoardProps {
  board: BoardType;
  userId: string;
}

export function Board({ board, userId }: BoardProps) {
  const [tasks, setTasks] = useState<Task[]>(board.tasks);
  const [modalStatus, setModalStatus] = useState<TaskStatus | null>(null);

  const handleWSMessage = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'task_created':
        setTasks(prev => {
          if (prev.some(t => t.id === event.payload.id)) return prev;
          return [...prev, event.payload];
        });
        break;
      case 'task_updated':
      case 'task_moved':
        setTasks(prev =>
          prev.map(t => (t.id === event.payload.id ? event.payload : t))
        );
        break;
      case 'task_deleted':
        setTasks(prev => prev.filter(t => t.id !== event.payload.id));
        break;
    }
  }, []);

  const { isConnected, activeUsers, cursors, sendCursorPosition } = useWebSocket({
    boardId: board.id,
    onMessage: handleWSMessage
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const taskId = active.id as number;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
    } catch {
      // Revert on error
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  };

  const handleAddTask = async (data: { title: string; description: string; assigned_to: string }) => {
    if (!modalStatus) return;

    try {
      await api.post('/tasks/', {
        ...data,
        board_id: board.id,
        status: modalStatus
      });
      
      setModalStatus(null);
    } catch {
      // Error handled by api wrapper
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await api.delete(`/tasks/${taskId}`);
    } catch {
      // Error handled by api wrapper
    }
  };

  // Track cursor position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const taskCard = target.closest('[data-task-id]');
      
      sendCursorPosition({
        x: e.clientX,
        y: e.clientY,
        taskId: taskCard ? parseInt(taskCard.getAttribute('data-task-id') || '0') : undefined
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [sendCursorPosition]);

  const tasksByStatus = Object.values(TaskStatus).reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
            {board.description && (
              <p className="text-gray-500 mt-1">{board.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <ActiveUsers users={activeUsers} currentUser={userId} />
            
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {Object.values(TaskStatus).map(status => (
              <Column
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                onAddTask={setModalStatus}
                onDeleteTask={handleDeleteTask}
                cursors={cursors}
                currentUser={userId}
              />
            ))}
          </div>
        </DndContext>
      </main>

      {modalStatus && (
        <AddTaskModal
          status={modalStatus}
          onClose={() => setModalStatus(null)}
          onSubmit={handleAddTask}
        />
      )}
    </div>
  );
}
