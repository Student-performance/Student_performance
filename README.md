# Student Performance — Sprint 1

> Educational web platform for student performance risk analysis using Express, EJS, SQLite, and a Python ML contract spike.  
> *Note: Execute all commands from this target repository root, not the planning website repository.*

---

## 📌 Sprint 1 Deliverables & Scope

| Feature / Route | Status | Description / Expected Behavior |
|---|---|---|
| `GET /` | ✅ Complete | Redirects guests to `/login` and authenticated users to `/datasets` |
| `GET /register`, `POST /register` | ✅ Complete | CSRF protection, password confirmation & strength checks, bcrypt hashing |
| `GET /login`, `POST /login` | ✅ Complete | Session regeneration upon login, failed attempt rejection |
| `POST /logout` | ✅ Complete | Destroys session, CSRF protected |
| `GET /datasets` | ✅ Complete | Authenticated dashboard displaying local dataset metadata |
| CSV Upload, Runs & Help | ⏳ Sprint 2–4 | Navigation links may return `404` (Upload in Sprint 2, Saved runs in Sprint 3, Evaluation/Help in Sprint 4). Do not treat those links as finished features. |

---

## ⚙️ Prerequisites

- **Node.js**: `>= 24 < 25` (run `nvm use` if using NVM; `.nvmrc` is included)
- **Python**: `3.12.x` (or `>= 3.10` compatible)
- **Git** & terminal shell (Bash, Zsh, or PowerShell 7+)

---

## 🚀 Installation & Setup

Clone the repository and navigate into the directory:

```bash
git clone https://github.com/Student-performance/Student_performance.git
cd Student_performance
```

### 1. Install Dependencies & Setup Virtual Environment

#### Linux / macOS (Bash / Zsh):
```bash
npm ci
if [ ! -f .env ]; then cp .env.example .env; fi

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Windows (PowerShell 7+):
```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

if (-not (Test-Path .venv/Scripts/python.exe)) { python -m venv .venv }
& .venv/Scripts/python.exe -m pip install -r requirements.txt
```

---

### 2. Configure Local Environment (`.env`)

Generate a secure random secret and configure your local `.env`:

```bash
# Generate a 32-byte secret to use for SESSION_SECRET
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

In `.env`, configure the following variables:

| Variable | Description & Recommended Setting |
|---|---|
| `PORT` | Local port for Express (default: `3000`) |
| `SESSION_SECRET` | Paste the random 32-byte hex generated above |
| `DATABASE_PATH` | Path to SQLite database file (default fallback: `./data/app.sqlite`). Both the database connection (`src/db/index.js`) and session store (`server.js`) default to `./data/app.sqlite` when this variable is unset. |
| `PYTHON_PATH` | Absolute path to the virtualenv Python interpreter (`.venv/bin/python` on Linux/macOS or `.venv\Scripts\python.exe` on Windows). If the path contains spaces, surround it with double quotes. |

> [!WARNING]
> Never commit `.env`, local database files, or virtual environments to Git. Each team member configures their own local path.

---

### 3. Migrations, Seeding & Tests

Every command below must exit with code `0`. Replaying migrations and seed scripts tests idempotency: replayed migrations must apply 0 new scripts, and re-seeding must not create duplicate accounts.

```bash
# 1. Run migrations twice to verify idempotency
npm run migrate
npm run migrate

# 2. Seed synthetic credentials (admin / password123)
npm run seed
npm run seed

# 3. Run database integrity and adapter test suite
npm test

# 4. Verify ML contract spike
# Linux / macOS:
.venv/bin/python ml/check_spike_contract.py
# Windows:
& .venv/Scripts/python.exe ml/check_spike_contract.py
```

> [!NOTE]
> The seed script creates local synthetic credentials: `admin / password123`. Use only disposable course data.

---

## 🧪 Start & Verify

### Terminal A (Start Application):
```bash
npm start
```
*Keep Terminal A running.*

### Terminal B (Run Automated Auth & Security Verification):
```bash
node scripts/check_sprint1_auth.js
```

The automated check suite must print its success message and exit `0`. It verifies:
- [x] Unauthenticated redirect to `/login`
- [x] CSRF enforcement and missing-token rejection (HTTP 403)
- [x] Weak password and mismatched confirmation rejection (HTTP 400)
- [x] Duplicate username and email prevention (HTTP 400)
- [x] Failed login attempt rejection (HTTP 400)
- [x] Session rotation on login (preventing session fixation)
- [x] Invalidation of old session IDs on protected `/datasets`
- [x] Authenticated dashboard access (HTTP 200)
- [x] CSRF-protected logout and session destruction

After the automated tests pass, open [http://localhost:3000/register](http://localhost:3000/register) in a browser to manually verify form labels, keyboard focus, error states, and responsive layout. Stop Terminal A with `Ctrl+C` when finished.

---

## 🤝 Shared AI / W1 / W3 Interface Contract

- **Dataset**: Mathematics `data/student-mat.csv` only (395 records).
- **Features**: Inference uses all 31 canonical features, including `G1` and excluding targets `G2` and `G3`.
- **Schemas**: Validated via `ml/schemas/schema-v1.json`, `ml/contract.py`, and fixtures under `ml/examples/`.
- **Envelope Protocol**: Bare input arrays return row-result arrays; `{ schema_version, rows }` envelopes return run metadata and risk score results. W1's adapter sends an envelope.
- **Model Version**: Sprint 1 model version is `v0.1-toy-contract-spike` (scores are protocol probes, not measured predictions). Sprint 3 will replace `predict.py` with frozen-model inference.

---

## 🔒 Cookie & Security Settings

For local HTTP development:
- Session cookies are set to `HttpOnly` and `SameSite=Lax`.
- Cookies do **not** use the `Secure` flag over unencrypted local HTTP.
- Hosted operations are outside the scope of this local MVP. Any future HTTPS hosting requires `Secure` cookies, reverse proxy trust settings, and a dedicated security review. The Sprint 1 local HTTP configuration is not a production hosting recipe.

---

## 📋 Evidence & Troubleshooting

- **Hand-off Evidence**: Record actual executed commands, exit codes (`0`), and commit/PR links on frontend task cards. A failing command blocks hand-off. Do not invent professor approval or test outcomes.
- **Missing Python / Interpreter Spawn Error**: Verify that `PYTHON_PATH` in `.env` exists and points to the valid virtualenv Python binary.
- **Missing Node Module**: Run `npm ci` from the repository root.
- **Connection Refused in Terminal B**: Ensure Terminal A is running `npm start`.
- **Non-Default Port**: If running on a port other than `3000`, set `APP_URL` in Terminal B (e.g. `APP_URL=http://localhost:4000 node scripts/check_sprint1_auth.js`).
