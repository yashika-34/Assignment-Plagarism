# AssignCheck

> **Detect Similarity. Evaluate Smarter. Not Harder.**

AssignCheck is a full-stack web application for detecting textual similarity and potential plagiarism between student assignments. It uses **symmetric Jaccard shingling** computed authoritatively on the server and generates detailed, side-by-side similarity reports.

---

## ✨ Features

- 📄 Upload assignments in **PDF, DOCX or TXT** format
- 🔍 **Student vs Student** pairwise comparison
- 👨‍🏫 **Teacher Reference** mode — compare against an answer key
- 📊 **Symmetric Jaccard Similarity** — `Sim(A, B)` always equals `Sim(B, A)`
- 📐 **Directional Coverage** — shows how much of each document is covered by the other
- 🟨 Color-coded text highlighting (matching phrases, typos, unique sections)
- 📑 Detailed side-by-side inspection view with phrase navigator
- 📚 Full analysis history per user account
- 👤 User profile dashboard with statistics
- 🔐 JWT-based authentication with role-based access control (student / teacher)
- 🛡️ Secure password change (requires current password or OTP token)
- 🧪 41 automated unit tests for the plagiarism engine

---

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| HTML5 / CSS3 / Vanilla JS (ES Modules) | UI structure, glassmorphic design, interactivity |
| PDF.js (CDN) | Extract text from PDF files in browser |
| Mammoth.js (CDN) | Extract text from DOCX files in browser |
| html2pdf.js (CDN) | Export detailed reports as PDF |

### Backend

| Technology | Purpose |
|---|---|
| Node.js + Express.js | REST API server |
| MongoDB + Mongoose | Persistent data storage (users, reports, file results) |
| bcrypt | Secure password hashing (10 salt rounds) |
| jsonwebtoken (JWT) | Stateless authentication and role encoding |
| express-rate-limit | Brute-force protection on auth endpoints |
| dotenv | Environment variable management |

---

## 📂 Project Structure

```text
Assignment-Plagiarism/
│
├── server.js                       # Secure Express REST API + Mongoose models
│
├── src/
│   ├── Middleware/
│   │   └── auth.js                 # JWT auth, role enforcement, password hashing
│   ├── Services/
│   │   ├── plagiarismEngine.js     # Authoritative Jaccard shingling engine (Node.js)
│   │   └── spellCheckService.js    # Server-side typo detection service
│   │
│   ├── Backend/                    # Backward-compatible re-export adapters
│   │   ├── CheckBackend.js         → re-exports Frontend/Scripts/CheckBackend.js
│   │   ├── HomeBackend.js          → re-exports Frontend/Scripts/HomeBackend.js
│   │   └── SpellChecker.js         → re-exports Frontend/Scripts/SpellChecker.js
│   │
│   └── Frontend/
│       ├── Scripts/
│       │   ├── config.js           # API base URL configuration
│       │   ├── CheckBackend.js     # Client-side file extraction + safe DOM rendering
│       │   ├── HomeBackend.js      # Login, signup, OTP-based password reset
│       │   ├── SpellChecker.js     # Client-side typo highlighting
│       │   ├── CheckAssign.js      # Main plagiarism checker page logic
│       │   ├── detailedReport.js   # Side-by-side report viewer
│       │   ├── history.js          # Analysis history page
│       │   ├── profile.js          # User profile dashboard
│       │   └── toast.js            # Toast notification system
│       ├── Templates/
│       │   ├── index.html          # Home / Login / Signup page
│       │   ├── CheckAssign.html    # File upload and comparison page
│       │   ├── DetailedReport.html # Detailed side-by-side report
│       │   ├── history.html        # Analysis history page
│       │   └── profile.html        # User profile page
│       └── styles/                 # CSS stylesheets
│
├── tests/
│   └── plagiarismEngine.test.js    # 41 automated unit tests (all passing)
│
├── scripts/
│   └── sanitize-db.js              # One-time DB credential sanitization
│
├── db.json                         # Sample seed data (demo accounts, sanitized)
├── .env.example                    # Environment variable template (no real secrets)
├── .gitignore                      # .env, node_modules, db.json excluded from git
├── package.json                    # Scripts: start, dev, test
└── README.md                       # This file
```

---

## ⚙️ Prerequisites

- **Node.js v18+** → https://nodejs.org
- **MongoDB** (local or Atlas cloud)
  - Local: [MongoDB Community Server](https://www.mongodb.com/try/download/community)
  - Cloud: [MongoDB Atlas](https://www.mongodb.com/atlas)

---

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Assignment-Plagiarism.git
cd Assignment-Plagiarism
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
copy .env.example .env
```

Edit `.env` and fill in your values:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/assigncheck
JWT_SECRET=your_long_random_secret_here
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

### 4. Start the server

```bash
npm start
```

The server starts at: **http://localhost:3000**

Open your browser and navigate to: **http://localhost:3000**

---

## 🧪 Running Tests

```bash
npm test
```

**41 tests** covering:
- Text normalization and tokenization
- Shingle generation (including edge cases)
- Identical, unrelated, and partially overlapping documents
- **Symmetry**: `Sim(A, B) === Sim(B, A)` — mathematically verified
- Directional document coverage
- Word insertion resilience
- Spelling mistake detection
- Filter options (exclude quotes, exclude references)
- Server-side score validation (spoofing prevention)

---

## 🔐 Security Model

| Feature | Implementation |
|---|---|
| Password storage | bcrypt hashed (10 rounds), never stored in plain text |
| Authentication | JWT Bearer tokens (7-day expiry) |
| Password reset | Requires 6-digit time-limited OTP (15 min) or current password |
| Route protection | `authenticateToken` middleware on all protected routes |
| Student isolation | Students can only read/delete **their own** reports and files |
| Teacher access | Teachers can view all reports and user data |
| Score integrity | Server **recalculates** similarity from `textA` + `textB`; ignores client-submitted scores |
| XSS prevention | File names rendered via `.textContent`, never `innerHTML` |
| Rate limiting | 30 auth attempts per 15 min; 500 general requests per 15 min |

---

## 📐 Algorithm: Symmetric Jaccard Similarity

AssignCheck computes plagiarism using **sliding-window 4-word shingles** and the **Jaccard set similarity** formula:

```
Overall Similarity (A, B) = |shingles(A) ∩ shingles(B)| / |shingles(A) ∪ shingles(B)| × 100%
```

This is **symmetric by definition**: `Sim(A, B) = Sim(B, A)` always.

Additionally, two **directional coverage** metrics are calculated:

```
Coverage A→B  = |shingles(A) ∩ shingles(B)| / |shingles(A)| × 100%
Coverage B→A  = |shingles(A) ∩ shingles(B)| / |shingles(B)| × 100%
```

### ⚠️ Limitations

- **Short texts** (< 4 words) may produce 0 shingles or reduced shingles.
- **Paraphrasing** at the word level reduces detected similarity — shingles require exact word sequences.
- **Spell checker** is a curated ~170-word academic typo dictionary, not a full English dictionary.
- **Similarity scores are estimates** of textual overlap — they do **not** constitute proof of academic misconduct.

---

## 🎭 Demo Accounts

The database is seeded with two demo accounts (sanitized, no real credentials):

| Role | Email | Password |
|---|---|---|
| Teacher | `teacher@example.edu` | `Teacher123!` |
| Student | `student@example.edu` | `Student123!` |

---

## 📋 Supported File Formats

| Format | Extraction Method |
|---|---|
| `.txt` | Native browser `File.text()` API |
| `.pdf` | PDF.js text layer extraction |
| `.docx` | Mammoth.js raw text extraction |

> Scanned PDF images (no text layer) will produce empty text and 0% similarity.

---

## 🐞 Known Limitations & Future Work

1. No email SMTP integration — OTP codes are returned in the API response (suitable for dev/demo; add SMTP for production)
2. Spell checker covers ~170 academic typos — a full Levenshtein dictionary is a planned enhancement
3. PDF.js requires the CDN script to be loaded in the browser — offline environments need a local copy
4. No admin panel UI — admin access is backend-only via direct API calls
