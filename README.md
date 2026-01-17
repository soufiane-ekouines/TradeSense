# TradeSense MVP

A Prop Trading SaaS MVP built with React (Vite) and Python (Flask).

## Repository Structure
- `/backend`: Flask API, SQLAlchemy Models, Services (Market Data, Rules Engine).
- `/frontend`: React + TailwindCSS + TradingView Lightweight Charts.
- `database.sql`: SQL Schema for PostgreSQL/SQLite.

## Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL (Optional, defaults to SQLite for dev)

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
flask run
```
The API will run at `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The App will run at `http://localhost:5173`.

### 3. Database Initialization
By default, `app.py` creates SQLite tables on startup.
To seed initial plans:
- Check `database.sql` for seed queries.
- Implementation handles plan seeding automatically if not present (logic to be added in seeding script).

## Features
- **Trading Challenge**: Evalutes daily loss (5%), max loss (10%), profit target (10%).
- **Market Data**: International (yfinance) + Morocco (Casablanca Stock Exchange Scraper).
- **Payments**: Mock CMI/Crypto + Admin Configurable PayPal.
- **Leaderboard**: Top 10 Traders by monthly profit %.
