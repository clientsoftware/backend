# Electric Shop Backend (Part 2)

Node.js + Express + Mongoose REST API for the copper/scrap trading POS.

## Setup

```bash
cd backend
npm install
```

Copy `.env.example` → `.env` and set your **MongoDB Atlas** URI:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/Electric Shop?retryWrites=true&w=majority
```

If Atlas/local Mongo is unreachable and `ALLOW_MEMORY_DB=true`, the server falls back to an in-memory MongoDB (dev only; data resets on restart).

## Run

```bash
npm start
# or
npm run dev
```

API: `http://localhost:5000`  
Health: `http://localhost:5000/api/health`

### Default admin (seeded)

- Email: `admin@Electric Shop.app`
- Password: `admin123`

## Structure

```
src/
  config/       # DB connection
  models/       # Mongoose schemas
  controllers/  # Business logic
  routes/       # Express routers
  middleware/   # JWT, validation, errors
  utils/        # units, PDF, responses
```

## Main routes

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/login` | Public |
| GET/POST | `/api/products` | Stock in secondary units |
| POST | `/api/sales` | Credit-limit check + stock deduct |
| POST | `/api/scrap-sales` | Scrap items only |
| POST | `/api/exchange` | Scrap↔copper + ledger |
| PUT | `/api/rates` | Append-only rate history |
| POST | `/api/dispatch` | P&L = sale − (expense + COGS) |
| POST | `/api/payments` | Updates customer due |
| POST | `/api/returns` | Restock + credit/cash |
| GET | `/api/reports/:type` | sales, stock, P&L, day-book… |
| GET | `/api/notifications/pending-payments` | Dues list |

Response shape: `{ success, data, message }`
