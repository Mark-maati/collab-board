import { useState, useEffect } from 'react';
import { Board } from './components/Board';
import { AuthPage } from './components/AuthPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Board as BoardType } from './types';
import { Plus, LayoutDashboard, LogOut, Loader2 } from 'lucide-react';
import { api } from './api';

function AppContent() {
  const { user, token, logout } = useAuth();
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(false);

  useEffect(() => {
    if (token) {
      fetchBoards();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<BoardType[]>('/boards/');
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boards');
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    setCreating(true);
    try {
      const newBoard = await api.post<BoardType>('/boards/', { 
        name: newBoardName.trim(),
        is_public: false
      });
      setBoards(prev => [newBoard, ...prev]);
      setNewBoardName('');
      setShowNewBoard(false);
      setSelectedBoard(newBoard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  if (!user || !token) {
    return <AuthPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (selectedBoard) {
    return (
      <div>
        <button
          onClick={() => setSelectedBoard(null)}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow text-gray-700"
        >
          <LayoutDashboard className="w-4 h-4" />
          All Boards
        </button>
        <Board board={selectedBoard} userId={user.username} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Collaboration Boards</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Logged in as <span className="font-medium text-gray-700">{user.username}</span>
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* New Board Card */}
          <div
            onClick={() => setShowNewBoard(true)}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center min-h-[160px]"
          >
            <div className="text-center">
              <Plus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">Create New Board</p>
            </div>
          </div>

          {/* Existing Boards */}
          {boards.map(board => (
            <div
              key={board.id}
              onClick={() => setSelectedBoard(board)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{board.name}</h3>
              {board.description && (
                <p className="text-gray-500 text-sm mb-4">{board.description}</p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{board.tasks.length} tasks</span>
                <span>Created {new Date(board.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {boards.length === 0 && (
          <div className="text-center py-12">
            <LayoutDashboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">No boards yet</h2>
            <p className="text-gray-400">Create your first board to get started</p>
          </div>
        )}
      </main>

      {/* New Board Modal */}
      {showNewBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Board</h2>
            <form onSubmit={createBoard}>
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Board name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                autoFocus
                disabled={creating}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewBoard(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBoardName.trim() || creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
