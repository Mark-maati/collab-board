import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus, COLUMN_CONFIG, CursorPosition } from '../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onDeleteTask: (id: number) => void;
  cursors: Record<string, CursorPosition>;
  currentUser: string;
}

export function Column({ 
  status, 
  tasks, 
  onAddTask, 
  onDeleteTask,
  cursors,
  currentUser 
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = COLUMN_CONFIG[status];

  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${config.color}`} />
          <h3 className="font-semibold text-gray-700">{config.title}</h3>
          <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[200px] p-2 rounded-lg transition-colors ${
          isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-gray-50'
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                cursors={cursors}
                currentUser={currentUser}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
