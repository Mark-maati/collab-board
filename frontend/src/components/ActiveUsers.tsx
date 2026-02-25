import { Users } from 'lucide-react';

interface ActiveUsersProps {
  users: string[];
  currentUser: string;
}

const COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-yellow-500',
  'bg-teal-500'
];

export function getUserColor(userId: string): string {
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[index % COLORS.length];
}

export function ActiveUsers({ users, currentUser }: ActiveUsersProps) {
  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-gray-500" />
      <div className="flex -space-x-2">
        {users.map((user) => (
          <div
            key={user}
            className={`w-8 h-8 rounded-full ${getUserColor(user)} flex items-center justify-center text-white text-xs font-medium border-2 border-white`}
            title={user === currentUser ? `${user} (you)` : user}
          >
            {user.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-sm text-gray-500">
        {users.length} online
      </span>
    </div>
  );
}
