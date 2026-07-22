# HappyPet Inventory - Agent Notes

## Repo Structure

- `frontend/` - React + TypeScript + Vite SPA (runs on port 5173)
- `backend/` - Django 6 + DRF API (runs on port 8000)
- Frontend build output goes to `backend/static/frontend_build/` (configured in `vite.config.ts`)

## Key Commands

### Frontend
```bash
cd frontend
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production (outputs to backend/static/frontend_build)
npm run lint         # Lint with ESLint + Prettier
```

### Backend
```bash
cd backend
python manage.py runserver  # Start API (http://localhost:8000)
python manage.py migrate    # Apply migrations
python manage.py makemigrations  # Create migrations
python manage.py test       # Run tests
```

## Architecture Notes

- **Backend**: Django with `happypet` as the main app folder. Apps: `users`, `products`, `services`, `sales`
- **API Router**: `backend/config/api_router.py` routes all app URLs under `/api/`
- **Authentication**: JWT via `djangorestframework-simplejwt`. Tokens have 60min access / 5 day refresh lifetime
- **User Model**: Custom model at `happypet.users` with `AUTH_USER_MODEL = "users.User"`
- **Database**: PostgreSQL (configured via `DATABASE_URL` env var in `.env`)
- **CORS**: Enabled for `localhost:5173` and `127.0.0.1:5173`

## Frontend Notes

- **API Base URL**: `http://localhost:8000/api` (see `frontend/src/services/api.ts`)
- **Auth**: JWT tokens stored via `TokenService`; interceptor injects `Authorization: Bearer <token>` on every request
- **State**: React Query for server state, React Context for auth/toast
- **Styling**: Tailwind CSS + PrimeReact UI library
- **Routing**: React Router v7 in `frontend/src/routes/Routes.tsx`
- **Validation**: Zod v4 with react-hook-form + @hookform/resolvers

## Testing

- Backend tests: `python manage.py test` inside `backend/`
- Frontend: No test framework configured (no vitest/jest found)
- Test files exist at `backend/happypet/<app>/tests.py`