# Курсовая работа Суринов Артём ЭФБО-03-24
# Обменный пункт

Веб-приложение для автоматизации работы обменного пункта. Система позволяет управлять курсами валют, проводить операции покупки/продажи, контролировать дневные лимиты и формировать отчётность.

## Основные возможности

**Роли пользователей (4):** гость, клиент, кассир, администратор.

- Регистрация и авторизация (**JWT**)
- Управление валютами и курсами:
  - история изменений
  - график динамики курса
- Проведение обменных операций с расчётом по актуальному курсу
- Контроль дневных лимитов (настраивается для валюты/клиента)
- Генерация **PDF-чеков** и **PDF-отчётов**
- Личный кабинет клиента:
  - история операций
  - скачивание чеков
  - редактирование профиля
- Панель кассира:
  - поиск/быстрая регистрация клиента
  - выполнение операции
- Панель администратора:
  - управление сотрудниками
  - управление валютами и курсами
  - просмотр всех операций и отчётов

## Технологический стек

| Компонент | Технологии |
|---|---|
| Frontend | React, Vite, React Router, Axios, Vitest, React Testing Library |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Pydantic, python-jose[cryptography], passlib, pytest |
| База данных | PostgreSQL |
| Документация API | Swagger UI (автоматически генерируется FastAPI) |

## Архитектура проекта

```text
exchange-point/
├── backend/
│   ├── app/
│   │   ├── routers/              # Эндпоинты (auth, admin, cashiers, operations, reports)
│   │   ├── models.py             # ORM-модели (SQLAlchemy)
│   │   ├── schemas.py            # Pydantic-схемы для валидации
│   │   ├── auth.py               # JWT, хэширование паролей, зависимости ролей
│   │   ├── database.py           # Подключение к PostgreSQL
│   │   ├── utils/
│   │   │   └── pdf_generator.py  # Генерация чеков и отчётов (с поддержкой кириллицы)
│   │   └── main.py               # Точка входа, CORS, подключение роутеров
│   ├── tests/                    # pytest (unit-тесты аутентификации и схем)
│   ├── requirements.txt
│   └── .env                      # DATABASE_URL, SECRET_KEY и т.д.
├── frontend/
│   ├── src/
│   │   ├── api/axios.js          # Клиент API с автоматическим добавлением токена
│   │   ├── components/           # PrivateRoute, Navbar, Layout, PhoneInput
│   │   ├── pages/                # Home, Login, Register, Profile, ClientDashboard,
│   │   │                         # CashierDashboard, AdminDashboard
│   │   └── main.jsx              # Роутинг (react-router-dom)
│   ├── tests/                    # Vitest + React Testing Library (PrivateRoute и др.)
│   └── package.json
└── README.md
```

## Установка и запуск

### Требования

- Python 3.12
- Node.js (npm)
- PostgreSQL

### 1) Настройка базы данных

```bash
# Создать базу данных (пример)
sudo -u postgres psql
CREATE DATABASE exchange;
```

### 2) Backend (FastAPI)

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows

pip install -r requirements.txt

# Создать файл .env (пример):
# DATABASE_URL=postgresql://user@localhost:5432/exchange
# SECRET_KEY=your-secret-key
# ALGORITHM=HS256
# ACCESS_TOKEN_EXPIRE_MINUTES=30

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API будет доступно по адресу: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### 3) Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Приложение откроется по адресу: `http://localhost:5173`

## Тестирование

### Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm run test
```

Пример теста: проверка редиректа неавторизованного пользователя (компонент `PrivateRoute`).

### Backend (pytest)

```bash
cd backend
pytest tests/
```

Проверяются:

- хэширование и верификация пароля (`test_auth.py`)
- создание и валидация JWT
- корректность Pydantic-схем (`test_schemas.py`)

## Документация

- Пользовательская документация (ввод в эксплуатацию) — раздел 3.4–3.5 отчёта.
- API-документация автоматически доступна в Swagger UI после запуска бэкенда.
- Исходный код программы приведён в Приложении А отчёта.

## Перспективы развития

- Интеграция с Госуслугами для автоматического заполнения данных клиента.
- Автоматическое обновление курсов валют из внешних источников в реальном времени.
