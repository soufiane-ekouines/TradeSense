# TradeSense - Vercel + Turso Deployment Guide

## 📁 File Restructuring Guide

Your current structure needs to be reorganized for Vercel deployment. Follow these steps:

### Step 1: Move Frontend Files to Root

Move all files from `frontend/` to the project root:

```powershell
# From the project root (exam folder)
Move-Item -Path "frontend\*" -Destination "." -Force

# Or manually move these:
# frontend/src/         → src/
# frontend/public/      → public/ (if exists)
# frontend/index.html   → index.html
# frontend/package.json → package.json
# frontend/vite.config.js → vite.config.js
# frontend/tailwind.config.js → tailwind.config.js
# frontend/postcss.config.js → postcss.config.js

# After moving, delete the empty frontend folder
Remove-Item -Path "frontend" -Recurse -Force
```

### Step 2: Create API Folder Structure

The `api/` folder has already been created with:
- `api/index.py` - Flask entry point for Vercel
- `api/requirements.txt` - Python dependencies

### Step 3: Final Project Structure

After restructuring, your project should look like:

```
exam/
├── api/
│   ├── index.py              # Flask API (Vercel serverless function)
│   └── requirements.txt      # Python dependencies
├── scripts/
│   └── seed_turso.py         # Database migration script
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   ├── context/
│   ├── locales/
│   ├── pages/
│   └── services/
├── database.sql              # Original SQL schema (for reference)
├── index.html                # Entry HTML file
├── package.json              # Node.js dependencies
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS config
├── postcss.config.js         # PostCSS config
├── vercel.json               # Vercel deployment config
└── README.md
```

---

## 🗄️ Database Migration to Turso

### Step 1: Install Turso CLI (Optional but Recommended)

```powershell
# Using Scoop (Windows)
scoop install turso

# Or using PowerShell
irm get.turso.tech/install.ps1 | iex
```

### Step 2: Set Environment Variables

```powershell
# PowerShell
$env:TURSO_DATABASE_URL = "libsql://tradesense-soufiane-ekouines.aws-eu-west-1.turso.io"
$env:TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njg2MDc1MDgsImlkIjoiODMzM2VlMjItYzA0MC00NWNlLWI5OTEtMGYxMmM1ZWI1OTAzIiwicmlkIjoiZTYxNzg3ZTMtZTE3NS00ZTI5LWI3YzAtYmZjZjM3YmZhZmI1In0.pe5rshEevZofelXBXCJz8zh5XCzRZxl0kxT5ue2oNDWD4nElpRLsUNk4A4BgYTVIJY_MRhhV97_vvDdf9uzUDA"
```

### Step 3: Install Python Dependencies

```powershell
pip install libsql-experimental
```

### Step 4: Run Migration Script

```powershell
cd "d:\master\master S3\Programmation web sous python\exam"
python scripts/seed_turso.py
```

---

## ⚙️ Vercel Configuration

### Step 1: Install Vercel CLI

```powershell
npm install -g vercel
```

### Step 2: Add Environment Variables to Vercel

Go to your Vercel dashboard or use the CLI:

```powershell
# Using Vercel CLI
vercel env add TURSO_DATABASE_URL
# Paste: libsql://tradesense-soufiane-ekouines.aws-eu-west-1.turso.io

vercel env add TURSO_AUTH_TOKEN
# Paste: your-auth-token

vercel env add JWT_SECRET
# Enter a secure random string
```

Or in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add:
   - `TURSO_DATABASE_URL` = `libsql://tradesense-soufiane-ekouines.aws-eu-west-1.turso.io`
   - `TURSO_AUTH_TOKEN` = `your-token`
   - `JWT_SECRET` = `your-secret-key`

### Step 3: Deploy

```powershell
# First time - link to Vercel
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## 🔧 Local Development

### Option 1: Run Frontend + Backend Separately

```powershell
# Terminal 1: Run Flask backend (original)
cd backend
python app.py

# Terminal 2: Run Vite frontend
npm run dev
```

### Option 2: Test Vercel Configuration Locally

```powershell
# Set environment variables first
$env:TURSO_DATABASE_URL = "your-url"
$env:TURSO_AUTH_TOKEN = "your-token"

# Run Vercel dev server
vercel dev
```

---

## 📝 API Routes Reference

After deployment, your API will be available at:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/me` | GET | Get current user |
| `/api/plans` | GET | Get all plans |
| `/api/challenges` | GET | Get user challenges |
| `/api/trades/:id` | GET/POST | Get/Create trades |
| `/api/leaderboard` | GET | Get leaderboard |
| `/api/v1/community/feed` | GET | Get community posts |
| `/api/market/quotes` | GET | Get market data |

---

## 🚨 Important Notes

1. **Authentication Tokens**: The JWT secret should be different between dev and production.

2. **CORS**: The API is configured to allow all origins. For production, you should restrict this.

3. **Static Files**: If you need to serve uploaded files, you'll need to use a cloud storage solution (AWS S3, Cloudinary, etc.) since Vercel serverless functions don't persist files.

4. **Cold Starts**: Serverless functions may have cold starts. The first request after inactivity might be slower.

5. **Function Timeout**: Vercel hobby plan has a 10s timeout. Pro plan allows up to 60s.

---

## 🔍 Troubleshooting

### "Module not found" errors
Make sure all imports in `api/index.py` are available in `api/requirements.txt`.

### Database connection errors
Verify your Turso credentials are correctly set in Vercel environment variables.

### 404 on API routes
Check that `vercel.json` rewrites are configured correctly.

### CORS errors
Verify CORS is enabled in Flask and the frontend is making requests to the correct URL.

---

## 📚 Additional Resources

- [Vercel Python Runtime](https://vercel.com/docs/functions/serverless-functions/runtimes/python)
- [Turso Documentation](https://docs.turso.tech/)
- [LibSQL Python Client](https://github.com/libsql/libsql-experimental-python)
- [Flask on Vercel](https://vercel.com/guides/deploying-flask-with-vercel)
