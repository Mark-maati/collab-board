import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, CursorPosition } from '../types';
import { GripVertical, User, Trash2 } from 'lucide-react';
import { getUserColor } from './ActiveUsers';

interface TaskCardProps {
  task: Task;
  onDelete: (id: number) => void;
  cursors: Record<string, CursorPosition>;
  currentUser: string;
}

export function TaskCard({ task, onDelete, cursors, currentUser }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  // Find users with cursors on this task
  const usersOnTask = Object.entries(cursors)
    .filter(([userId, cursor]) => cursor.taskId === task.id && userId !== currentUser)
    .map(([userId]) => userId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-default
        ${isDragging ? 'opacity-50 shadow-lg' : ''} 
        ${usersOnTask.length > 0 ? 'ring-2 ring-offset-1' : ''}
        hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-3">
            {task.assigned_to ? (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <User className="w-3 h-3" />
                <span>{task.assigned_to}</span>
              </div>
            ) : (
              <span />
            )}
            
            <button
              onClick={() => onDelete(task.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {usersOnTask.length > 0 && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
          {usersOnTask.map(userId => (
            <div
              key={userId}
              className={`w-5 h-5 rounded-full ${getUserColor(userId)} flex items-center justify-center text-white text-xs`}
              title={`${userId} is viewing`}
            >
              {userId.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
