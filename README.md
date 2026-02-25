# Collab Board

A real-time collaboration task board application with drag-and-drop functionality, live cursor tracking, and WebSocket-based updates.

## Features

- **Real-time Collaboration**: Multiple users can work on the same board simultaneously
- **Drag & Drop**: Intuitive task management with @dnd-kit
- **Live Cursors**: See other users' cursor positions in real-time
- **JWT Authentication**: Secure user registration and login
- **Board Management**: Create, view, and manage multiple boards
- **Task Statuses**: Todo, In Progress, Review, Done columns

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Async ORM with PostgreSQL
- **WebSockets** - Real-time bidirectional communication
- **JWT** - Token-based authentication (python-jose)
- **Rate Limiting** - slowapi for API protection

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **@dnd-kit** - Drag and drop

### Infrastructure
- **Docker** - Containerization
- **PostgreSQL** - Database

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Quick Start with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/Mark-maati/collab-board.git
   cd collab-board
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the application:
   ```bash
   docker-compose up --build
   ```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/collab_board
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
DEBUG=false
ALLOWED_ORIGINS=http://localhost:5173
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user

### Boards
- `GET /api/boards/` - List all boards
- `POST /api/boards/` - Create new board
- `GET /api/boards/{id}` - Get board with tasks

### Tasks
- `POST /api/tasks/` - Create task
- `PATCH /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### WebSocket
- `WS /ws/{board_id}?token=JWT` - Real-time board updates

## Project Structure

```
collaboration-app/
├── backend/
│   ├── app/
│   │   ├── routers/      # API routes
│   │   ├── auth.py       # JWT authentication
│   │   ├── config.py     # Settings
│   │   ├── database.py   # DB connection
│   │   ├── main.py       # FastAPI app
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── schemas.py    # Pydantic schemas
│   │   └── websocket_manager.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── api.ts        # API client
│   │   ├── App.tsx
│   │   └── types.ts
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## Security Features

- JWT-based authentication
- Rate limiting on all endpoints
- CORS configuration
- Security headers (HSTS, CSP, X-Frame-Options)
- WebSocket connection limits
- Input validation with Pydantic

## License

MIT
