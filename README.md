![AssignCheck Banner](Assets/banner.jpg)

<div align="center">

# AssignCheck

**The most transparent plagiarism checker built for classrooms.**  
Compare student submissions, match against teacher references, and see exactly what matched — backed by evidence, not black boxes.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-assignment--plagarism--2.onrender.com-4f46e5?style=for-the-badge&labelColor=1e1b4b)](https://assignment-plagarism-2.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Tests](https://img.shields.io/badge/Tests-41_Passing-22c55e?style=for-the-badge&logo=checkmarx&logoColor=white)](./tests)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📸 Screenshots

### 🏠 Home Page
![Home Page](Assets/Screenshots/home.jpeg)

### 📤 Student vs Student Mode
![Student vs Student Upload](Assets/Screenshots/studentstudent.jpeg)

### 👨‍🏫 Teacher vs Student Mode
![Teacher vs Student Upload](Assets/Screenshots/teacherstudent.jpeg)

### 📊 Similarity Results with Side-by-Side Diff
![Similarity Results](Assets/Screenshots/result.jpeg)

### 📚 Analysis History
![Analysis History](Assets/Screenshots/history.jpeg)

### 👤 User Profile Dashboard
![User Profile](Assets/Screenshots/profile.jpeg)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **Multi-format Upload** | Supports PDF, DOCX, and TXT files via drag & drop or click-to-browse |
| 🔍 **Student vs Student** | Pairwise similarity detection across any number of submissions |
| 👨‍🏫 **Teacher Reference Mode** | Compare student work against an official answer key |
| 🏫 **Classroom Batch Mode** | Evaluate entire class at once — peer collusion matrix included |
| 📊 **Symmetric Jaccard Algorithm** | Sim(A,B) always equals Sim(B,A) — mathematically guaranteed |
| 🟨 **Color-Coded Highlighting** | Matching, different, and unique phrases highlighted live in browser |
| 🔤 **Typo-Tolerant Matching** | Spelling mistakes (Levenshtein ≤ 2) still count toward similarity |
| 📑 **Detailed Side-by-Side Report** | Phrase navigator, section diff, match inspector |
| 🎖️ **Originality Certificate** | Downloadable A4 PDF certificate with QR verification code |
| 📥 **PDF Report Export** | Full analysis downloadable as formatted PDF |
| 📚 **Full History** | All past analyses saved per user account with filter by mode |
| 👤 **Profile Dashboard** | Stats: total analyses, avg similarity, documents checked |
| 🔐 **JWT Authentication** | Secure login with role-based access (student / teacher) |
| 🛡️ **Score Integrity** | Server recalculates similarity from raw text — client scores ignored |
| ⚡ **Rate Limiting** | 30 auth attempts / 15 min; 500 general requests / 15 min |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 / CSS3 / Vanilla JS (ES Modules) | UI structure, glassmorphic design, interactivity |
| PDF.js (CDN) | Extract text from PDF files in-browser |
| Mammoth.js (CDN) | Extract text from DOCX files in-browser |
| html2pdf.js (CDN) | Export reports and certificates as PDF |

### Backend
| Technology | Purpose |
|---|---|
| Node.js 18+ + Express 5 | REST API server |
| MongoDB + Mongoose | Persistent storage (users, reports, file data) |
| bcrypt | Secure password hashing (10 salt rounds) |
| jsonwebtoken (JWT) | Stateless auth + role encoding |
| express-rate-limit | Brute-force protection on all auth endpoints |
| nspell + dictionary-en | Server-side spell check dictionary |

---

## 📂 Project Structure

`	ext
Assignment-Plagiarism/
│
├── server.js                        # Express bootstrap: mounts routes, DB & static files
├── render.yaml                      # Render.com auto-deploy configuration
│
├── src/
│   └── Backend/
│       ├── Config/db.js             # MongoDB Atlas connection
│       ├── Controllers/             # MVC controllers (api, auth, reports, filedata, users)
│       ├── Middleware/              # JWT auth, rate limiter
│       ├── Models/                  # Mongoose models (User, Report, FileData)
│       ├── Routes/                  # Express route registration
│       └── Services/
│           ├── plagiarismEngine.js  # Authoritative Jaccard shingling + fuzzy typo alignment
│           └── spellCheckService.js # Server-side typo detection with nspell
│
└── src/Frontend/
    ├── Templates/                   # HTML pages (index, CheckAssign, DetailedReport, history, profile)
    ├── styles/                      # CSS (index, checkAssign, detailedReport, history, profile, certificate)
    └── Scripts/
        ├── CheckAssign.js           # Main checker: upload, batch compare, progress, results UI
        ├── CheckBackend.js          # File text extraction (PDF/DOCX/TXT), chunk building, Jaccard local
        ├── detailedReport.js        # Side-by-side diff viewer, PDF export
        ├── certificateModal.js      # Originality certificate generator with QR code
        ├── history.js               # History page with filter and modal
        ├── profile.js               # Profile dashboard + password change
        ├── SpellChecker.js          # Client-side typo detection + fuzzy matching
        └── toast.js                 # Toast notification system
`

---

## ⚙️ Local Setup

### Prerequisites
- **Node.js v18+** → https://nodejs.org
- **MongoDB** (local or Atlas)

### 1. Clone

`ash
git clone https://github.com/yashika-34/Assignment-Plagarism.git
cd Assignment-Plagarism
`

### 2. Install dependencies

`ash
npm install
`

### 3. Configure environment

`ash
copy .env.example .env
`

Edit .env:

`env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/assigncheck
JWT_SECRET=your_long_random_secret_here
`

> ⚠️ **Never commit your .env file.** It's already in .gitignore.

### 4. Start

`ash
npm start
`

Open: **http://localhost:3000**

---

## 🧪 Running Tests

`ash
# 41 plagiarism engine unit tests
npm test

# 16 API integration tests
npm run test:api

# Both
npm run test:all
`

**Test coverage:**
- Text normalization & tokenization
- Shingle generation (edge cases: short text, empty text)
- Symmetry guarantee: Sim(A,B) === Sim(B,A) — mathematically verified
- Identical / unrelated / partially overlapping documents
- Fuzzy typo alignment (Levenshtein ≤ 2)
- Filter options: exclude quotes, exclude references, exclude small matches
- Server-side score validation (spoofing prevention)

---

## 🔐 Security Model

| Feature | Implementation |
|---|---|
| Password storage | bcrypt hashed (10 rounds), never plain text |
| Authentication | JWT Bearer tokens (7-day expiry) |
| Password reset | 6-digit time-limited OTP (15 min) or current password |
| Route protection | uthenticateToken middleware on all protected routes |
| Student isolation | Students can only read/delete **their own** reports |
| Teacher access | Teachers can view all reports and users |
| Score integrity | Server **recalculates** from 	extA+	extB; ignores client scores |
| XSS prevention | File names via .textContent, never innerHTML |
| Rate limiting | 30 auth/15 min; 500 general/15 min |

---

## 📐 Algorithm: Symmetric Jaccard Similarity

AssignCheck uses **sliding-window 4-gram shingles** with **Jaccard set similarity**:

`
Similarity(A, B) = |shingles(A) ∩ shingles(B)|  ×  100%
                   ─────────────────────────────
                   |shingles(A) ∪ shingles(B)|
`

This is **symmetric by definition**: Sim(A, B) = Sim(B, A) always.

### Typo-Tolerant Matching
Words with Levenshtein distance ≤ 1 (short words) or ≤ 2 (long words) are fuzzy-aligned before shingling, so spelling mistakes still contribute to the similarity score.

### Directional Coverage
`
Coverage A→B = |shingles(A) ∩ shingles(B)| / |shingles(A)| × 100%
Coverage B→A = |shingles(A) ∩ shingles(B)| / |shingles(B)| × 100%
`

---

## 🎭 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Teacher | 	eacher@example.edu | Teacher123! |
| Student | student@example.edu | Student123! |

---

## 📋 Supported File Formats

| Format | Method |
|---|---|
| .txt | Native File.text() API |
| .pdf | PDF.js text layer extraction |
| .docx | Mammoth.js raw text extraction |

> Scanned PDFs (image-only, no text layer) will return 0% similarity.

---

## 🚀 Deploy to Render

This repo includes a [ender.yaml](render.yaml) for one-click deployment:

1. Fork this repo
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New Web Service**
3. Connect your GitHub repo
4. Render auto-detects ender.yaml — just add your env vars:
   - MONGODB_URI → your MongoDB Atlas connection string
   - JWT_SECRET → a long random secret
5. Click **Deploy** ✅

---

## 📄 License

MIT © 2024 AssignCheck

---

<div align="center">
Made with ❤️ for academic integrity
</div>
