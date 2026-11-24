# FastAPI Todo App

Python FastAPI task-management REST API with JWT auth.

## Live

- API: https://fastapi-todo-app.vercel.app
- Docs: https://fastapi-todo-app.vercel.app/docs

## Stack

- FastAPI + Uvicorn
- JWT auth
- SQLAlchemy (SQLite on Vercel by default, Postgres via `DATABASE_URL`)

## Local

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```
