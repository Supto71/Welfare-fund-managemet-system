# 🏦 আসেন খাই কল্যাণ তহবিল

A RESTful API built with **Node.js**, **Express**, and **SQLite** for managing the **আসেন খাই কল্যাণ তহবিল** (Share & Welfare Fund). Supports JWT-based authentication with role-based access control (`admin` / `member`).

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── db/
│   │   └── database.js          # SQLite init & singleton db export
│   ├── middleware/
│   │   └── auth.js              # JWT authenticate + requireRole middleware
│   ├── routes/
│   │   ├── auth.js              # POST /api/auth/register, /login
│   │   ├── dashboard.js         # GET  /api/dashboard/summary
│   │   └── admin.js             # PUT  /api/admin/update-share, /update-welfare
│   └── server.js                # Express app entry point
├── data/                        # Auto-created; holds welfare_fund.db
├── .env                         # Environment variables (git-ignored)
├── .env.example                 # Template for environment variables
├── .gitignore
└── package.json
```

---

## ⚙️ Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

| Variable        | Default                              | Description                   |
|-----------------|--------------------------------------|-------------------------------|
| `PORT`          | `5000`                               | HTTP port                     |
| `JWT_SECRET`    | *(set a strong secret)*              | Secret used to sign JWTs      |
| `JWT_EXPIRES_IN`| `7d`                                 | Token expiry duration         |
| `DB_PATH`       | `./data/welfare_fund.db`             | Path to the SQLite database   |

### 3. Seed the database

Populates the admin account and all 18 members with default `shares_summary` rows:

```bash
npm run seed
```

> To wipe the database and start fresh: `npm run seed:fresh`

After seeding you'll have:

| Account | Email | Default Password |
|---------|-------|------------------|
| Admin | admin@asenkhaikakalyan.com | `Admin@1234` |
| All 18 members | `<firstname>@asenkhaikakalyan.com` | `Member@1234` |

> ⚠️ **Change these passwords before deploying to production.**

### 4. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.

---

## 🗄️ Database Schema

### `users`
| Column      | Type    | Notes                        |
|-------------|---------|------------------------------|
| id          | INTEGER | Primary key, auto-increment  |
| name        | TEXT    | Required                     |
| email       | TEXT    | Unique, required             |
| password    | TEXT    | Bcrypt hashed                |
| role        | TEXT    | `'admin'` or `'member'`      |
| created_at  | TEXT    | ISO datetime                 |

### `shares_summary`
| Column         | Type    | Notes                           |
|----------------|---------|---------------------------------|
| id             | INTEGER | Primary key, auto-increment     |
| user_id        | INTEGER | FK → users.id (unique)          |
| planned_amount | REAL    | Default `5850`                  |
| actual_amount  | REAL    | Default `0`                     |
| updated_at     | TEXT    | ISO datetime                    |

### `welfare_fund`
| Column          | Type    | Notes                       |
|-----------------|---------|-----------------------------|
| id              | INTEGER | Primary key, auto-increment |
| total_donation  | REAL    | Default `0`                 |
| total_expense   | REAL    | Default `0`                 |
| updated_at      | TEXT    | ISO datetime                |

---

## 🔌 API Reference

### Health Check

```
GET /api/health
```

---

### Auth

#### Register
```
POST /api/auth/register
```
**Body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123",
  "role": "member"
}
```
> `role` is optional and defaults to `"member"`. Must be `"admin"` or `"member"`.

**Response `201`:**
```json
{
  "success": true,
  "message": "Registration successful.",
  "token": "<JWT>",
  "user": { "id": 1, "name": "Alice", "email": "alice@example.com", "role": "member" }
}
```

---

#### Login
```
POST /api/auth/login
```
**Body:**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response `200`:**
```json
{
  "success": true,
  "token": "<JWT>",
  "user": { "id": 1, "name": "Alice", "email": "alice@example.com", "role": "member" }
}
```

---

### Dashboard

#### Summary  *(requires JWT)*
```
GET /api/dashboard/summary
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalSavings": 45000,
    "soldShares": 7,
    "welfareBalance": 12000,
    "totalDonation": 15000,
    "totalExpense": 3000,
    "memberCount": 18,
    "members": [
      {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "member",
        "planned_amount": 5850,
        "actual_amount": 3000,
        "share_updated_at": "2024-03-15T10:30:00"
      }
    ]
  }
}
```

---

### Admin  *(requires JWT + admin role)*

#### Update Member Share
```
PUT /api/admin/update-share
Authorization: Bearer <admin-token>
```
**Body:**
```json
{ "userId": 1, "actual_amount": 3000 }
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Share record updated for user \"Alice\".",
  "data": { "id": 1, "user_id": 1, "planned_amount": 5850, "actual_amount": 3000, "updated_at": "..." }
}
```

---

#### Update Welfare Fund
```
PUT /api/admin/update-welfare
Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "field": "total_donation",
  "amount": 5000,
  "mode": "add"
}
```
> `field`: `"total_donation"` or `"total_expense"`  
> `mode`: `"set"` (replace, default) | `"add"` (increment)

**Response `200`:**
```json
{
  "success": true,
  "message": "Welfare fund \"total_donation\" updated successfully.",
  "data": {
    "total_donation": 20000,
    "total_expense": 3000,
    "welfareBalance": 17000
  }
}
```

---

## 🔐 Authentication

All protected routes require a `Bearer` token in the `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

| Route                            | Auth Required | Role    |
|----------------------------------|---------------|---------|
| `GET  /api/health`               | No            | —       |
| `POST /api/auth/register`        | No            | —       |
| `POST /api/auth/login`           | No            | —       |
| `GET  /api/dashboard/summary`    | Yes           | Any     |
| `PUT  /api/admin/update-share`   | Yes           | Admin   |
| `PUT  /api/admin/update-welfare` | Yes           | Admin   |

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express 4
- **Database**: SQLite via `better-sqlite3`
- **Auth**: JWT (`jsonwebtoken`) + Bcrypt (`bcryptjs`)
- **Dev**: Nodemon for hot-reload
