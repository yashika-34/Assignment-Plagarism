// server.js
// Express + MongoDB backend for AssignCheck
// Authoritative Plagiarism Detection, Role-Based Access Control, and Secure Authentication

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const {
  JWT_SECRET,
  SALT_ROUNDS,
  authenticateToken,
  optionalToken,
  requireRole,
  hashPassword,
  comparePassword,
  formatDoc
} = require("./src/Middleware/auth");

const { compareDocuments } = require("./src/Services/plagiarismEngine");
const { detectSpellingMistakes } = require("./src/Services/spellCheckService");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/assigncheck";

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve frontend static assets with cache headers
const staticOptions = {
  maxAge: "1h",
  etag: true
};
app.use(express.static(path.join(__dirname, "src/Frontend"), staticOptions));
app.use(express.static(path.join(__dirname, "src"), staticOptions));
app.use(express.static(path.join(__dirname, "src/Frontend/Templates"), staticOptions));

// Root URL → redirect to the homepage
app.get("/", (req, res) => {
  res.redirect("/Templates/index.html");
});

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP. Please try again after 15 minutes." }
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again after 15 minutes." }
});

// =========================================
// MONGOOSE SCHEMAS & MODELS
// =========================================

// 1. User Schema
const userSchema = new mongoose.Schema(
  {
    customId: { type: String, default: () => new mongoose.Types.ObjectId().toString(), index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual("id").get(function () {
  return this.customId || this._id.toString();
});

const User = mongoose.model("User", userSchema);

// 2. Report Schema
const reportSchema = new mongoose.Schema(
  {
    customId: { type: String, default: () => new mongoose.Types.ObjectId().toString(), index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    files: [{ type: String }],
    type: { type: String, default: "student" },
    similarity: { type: Number, default: 0 },
    coverageA: { type: Number, default: 0 },
    coverageB: { type: Number, default: 0 },
    symmetric: { type: Boolean, default: true },
    matchingSections: { type: Number, default: 0 },
    differentSections: { type: Number, default: 0 },
    matchingPhrases: { type: Number, default: 0 },
    spellingMistakes: { type: Number, default: 0 },
    date: { type: Date, default: Date.now, index: -1 },
    textA: { type: String, default: "" },
    textB: { type: String, default: "" },
    filefirstmatches: { type: Array, default: [] },
    filesecondmatches: { type: Array, default: [] },
    commonPhrases: { type: Array, default: [] },
    spellingMistakesA: { type: Array, default: [] },
    spellingMistakesB: { type: Array, default: [] },
    allSpellingMistakes: { type: Array, default: [] },
    disclaimer: {
      type: String,
      default: "Estimated textual overlap based on sliding n-gram analysis. Does not constitute definitive proof of academic misconduct."
    }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reportSchema.index({ email: 1, date: -1 });

reportSchema.virtual("id").get(function () {
  return this.customId || this._id.toString();
});

const Report = mongoose.model("Report", reportSchema);

// 3. FileData Schema
const fileDataSchema = new mongoose.Schema(
  {
    customId: { type: String, default: () => new mongoose.Types.ObjectId().toString(), index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    filedetails: { type: Array, default: [] }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

fileDataSchema.virtual("id").get(function () {
  return this.customId || this._id.toString();
});

const FileData = mongoose.model("FileData", fileDataSchema);

// 4. FileResult Schema
const fileResultSchema = new mongoose.Schema(
  {
    customId: { type: String, default: () => new mongoose.Types.ObjectId().toString(), index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    filesprocesed: { type: Array, default: [] }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

fileResultSchema.virtual("id").get(function () {
  return this.customId || this._id.toString();
});

const FileResult = mongoose.model("FileResult", fileResultSchema);

// =========================================
// DATA SEED / MIGRATION FROM db.json
// =========================================
async function rehashPlaintextPasswords() {
  try {
    const users = await User.find();
    let rehashed = 0;
    for (const user of users) {
      const alreadyHashed = user.password && user.password.startsWith("$2");
      if (!alreadyHashed) {
        const hashed = await hashPassword(user.password);
        await User.updateOne({ _id: user._id }, { password: hashed });
        rehashed++;
      }
    }
    if (rehashed > 0) {
      console.log(`Re-hashed ${rehashed} plain-text password(s) in MongoDB.`);
    }
  } catch (err) {
    console.error("Error during password re-hash migration:", err.message);
  }
}

async function seedInitialDataIfEmpty() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return;
    }

    const dbJsonPath = path.join(__dirname, "db.json");
    if (!fs.existsSync(dbJsonPath)) return;

    const raw = fs.readFileSync(dbJsonPath, "utf-8");
    const data = JSON.parse(raw);

    // 1. Seed Users
    if (Array.isArray(data.users) && data.users.length > 0) {
      for (const u of data.users) {
        const passwordHash = u.password && u.password.startsWith("$2")
          ? u.password
          : await hashPassword(u.password || "Password123!");

        await User.create({
          customId: u.id,
          name: u.name,
          email: u.email,
          password: passwordHash,
          role: u.role || (u.email && u.email.includes("teacher") ? "teacher" : "student")
        });
      }
      console.log(`Migrated ${data.users.length} users to MongoDB.`);
    }

    // 2. Seed Reports
    if (Array.isArray(data.reports) && data.reports.length > 0) {
      for (const r of data.reports) {
        await Report.create({
          customId: r.id,
          email: r.email,
          files: r.files || [],
          type: r.type || "student",
          similarity: r.similarity || 0,
          matchingSections: r.matchingSections || 0,
          differentSections: r.differentSections || 0,
          matchingPhrases: r.matchingPhrases || 0,
          spellingMistakes: r.spellingMistakes || 0,
          date: r.date || new Date(),
          textA: r.textA || "",
          textB: r.textB || "",
          filefirstmatches: r.filefirstmatches || [],
          filesecondmatches: r.filesecondmatches || []
        });
      }
      console.log(`Migrated ${data.reports.length} reports to MongoDB.`);
    }

    // 3. Seed FileData
    if (Array.isArray(data.filedata) && data.filedata.length > 0) {
      for (const f of data.filedata) {
        await FileData.create({
          customId: f.id,
          email: f.email,
          filedetails: f.filedetails || []
        });
      }
      console.log(`Migrated ${data.filedata.length} filedata entries to MongoDB.`);
    }

    // 4. Seed FileResult
    if (Array.isArray(data.fileresult) && data.fileresult.length > 0) {
      for (const fr of data.fileresult) {
        await FileResult.create({
          customId: fr.id,
          email: fr.email,
          filesprocesed: fr.filesprocesed || fr.filesProcessed || []
        });
      }
      console.log(`Migrated ${data.fileresult.length} fileresult entries to MongoDB.`);
    }
  } catch (err) {
    console.error("Error during initial data seed:", err.message);
  }
}

// =========================================
// REST API ENDPOINTS
// =========================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: "mongodb",
    connectionState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// -----------------------------------------
// AUTHENTICATION ENDPOINTS
// -----------------------------------------

// Registration
app.post("/users", authLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await hashPassword(password);
    const assignedRole = role === "teacher" ? "teacher" : "student";

    const newUser = await User.create({
      customId: req.body.id || new mongoose.Types.ObjectId().toString(),
      name: name || "User",
      email: cleanEmail,
      password: hashedPassword,
      role: assignedRole
    });

    const userObj = formatDoc(newUser);
    const token = jwt.sign(
      { id: userObj.id, email: userObj.email, name: userObj.name, role: userObj.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ ...userObj, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const userObj = formatDoc(user);
    const token = jwt.sign(
      { id: userObj.id, email: userObj.email, name: userObj.name, role: userObj.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify token
app.get("/auth/verify", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true, user: formatDoc(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated password change (requires verifying current password)
app.post("/auth/change-password", authenticateToken, authLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = await comparePassword(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password - Generates an expiring, single-use verification token
app.post("/auth/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    // Generate secure 6-digit numeric OTP / token
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetToken = resetToken;
    user.resetTokenExpiry = expiry;
    await user.save();

    res.json({
      success: true,
      message: "Reset token generated. Valid for 15 minutes.",
      resetToken: resetToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure Password Reset - Requires valid resetToken or currentPassword
app.post("/auth/reset-password", authLimiter, async (req, res) => {
  try {
    const { email, resetToken, currentPassword, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must contain at least 6 characters" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    let isAuthorized = false;

    // Method 1: Using single-use resetToken
    if (resetToken) {
      if (
        user.resetToken &&
        user.resetToken === resetToken &&
        user.resetTokenExpiry &&
        new Date(user.resetTokenExpiry) > new Date()
      ) {
        isAuthorized = true;
      } else {
        return res.status(403).json({ error: "Invalid or expired reset token" });
      }
    } else if (currentPassword) {
      // Method 2: Verified using currentPassword
      const match = await comparePassword(currentPassword, user.password);
      if (match) {
        isAuthorized = true;
      } else {
        return res.status(401).json({ error: "Incorrect current password" });
      }
    } else {
      // Security enforcement: Reject resets without token or current password
      return res.status(400).json({
        error: "Password reset requires a valid resetToken or currentPassword. Unverified resets are prohibited."
      });
    }

    if (isAuthorized) {
      user.password = await hashPassword(newPassword);
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();
      return res.json({ success: true, message: "Password updated successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// USERS ENDPOINTS (Protected with RBAC)
// -----------------------------------------
app.get("/users", authenticateToken, async (req, res) => {
  try {
    const query = {};
    const userRole = req.user.role || "student";

    if (userRole === "student") {
      // Students can only query their own account
      query.email = req.user.email.toLowerCase();
    } else if (req.query.email) {
      query.email = req.query.email.toLowerCase().trim();
    }

    const users = await User.find(query).select("-password -resetToken -resetTokenExpiry").lean();
    res.json(users.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select("-password -resetToken -resetTokenExpiry");
    }
    if (!user) {
      user = await User.findOne({ customId: id }).select("-password -resetToken -resetTokenExpiry");
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Role check: Students can only view their own user profile
    if (req.user.role === "student" && user.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to view other users" });
    }

    res.json(formatDoc(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/users/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { customId: id }] }
      : { customId: id };

    const targetUser = await User.findOne(filter);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow updating own profile unless admin
    if (targetUser.email.toLowerCase() !== req.user.email.toLowerCase() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized: You can only update your own profile" });
    }

    const update = { ...req.body };
    delete update._id;
    delete update.customId;
    delete update.resetToken;
    delete update.resetTokenExpiry;

    if (update.password && !update.password.startsWith("$2")) {
      update.password = await hashPassword(update.password);
    }

    const updated = await User.findOneAndUpdate(filter, update, { new: true, runValidators: true });
    res.json(formatDoc(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// AUTHORITATIVE SIMILARITY API
// -----------------------------------------
app.post("/api/check-similarity", optionalToken, async (req, res) => {
  try {
    const { textA, textB, options } = req.body;
    if (typeof textA !== "string" || typeof textB !== "string") {
      return res.status(400).json({ error: "Both textA and textB strings are required" });
    }

    const result = await compareDocuments(textA, textB, options || {});
    res.json({
      success: true,
      result: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// DYNAMIC SPELL CHECK API
// -----------------------------------------
app.post("/api/spellcheck", optionalToken, async (req, res) => {
  try {
    const { text, docLabel } = req.body;
    if (typeof text !== "string") {
      return res.status(400).json({ error: "Text string is required" });
    }

    const mistakes = await detectSpellingMistakes(text, docLabel || "Document");
    res.json({
      success: true,
      mistakes: mistakes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// REPORTS ENDPOINTS (Protected with RBAC)
// -----------------------------------------
app.get("/reports", authenticateToken, async (req, res) => {
  try {
    const query = {};
    const userRole = req.user.role || "student";

    if (userRole === "student") {
      // Students can ONLY view their own reports
      query.email = req.user.email.toLowerCase();
    } else {
      // Teachers and admins can view all or filter by email
      if (req.query.email) {
        query.email = req.query.email.toLowerCase().trim();
      }
    }

    const reports = await Report.find(query).sort({ date: -1 }).lean();
    res.json(reports.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/reports/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    let report = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      report = await Report.findById(id);
    }
    if (!report) {
      report = await Report.findOne({ customId: id });
    }
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Role check: Students cannot access other students' private reports
    const isOwner = report.email && report.email.toLowerCase() === req.user.email.toLowerCase();
    const isTeacher = req.user.role === "teacher" || req.user.role === "admin";

    if (!isOwner && !isTeacher) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to view this report" });
    }

    res.json(formatDoc(report));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reports - Server recalculates and validates similarity score authoritatively
app.post("/reports", optionalToken, async (req, res) => {
  try {
    const reportData = { ...req.body };
    reportData.customId = req.body.id || new mongoose.Types.ObjectId().toString();

    // Attach verified user email if token present
    if (req.user && req.user.email) {
      reportData.email = req.user.email.toLowerCase();
    } else if (reportData.email) {
      reportData.email = reportData.email.toLowerCase().trim();
    } else {
      return res.status(400).json({ error: "Email is required to save report" });
    }

    // Authoritative Server-side Score Validation:
    // If textA and textB are present, recompute similarity score and reject/override client spoofing!
    if (typeof reportData.textA === "string" && typeof reportData.textB === "string") {
      const serverAnalysis = await compareDocuments(reportData.textA, reportData.textB, reportData.filters || {});
      reportData.similarity = serverAnalysis.similarity;
      reportData.coverageA = serverAnalysis.coverageA;
      reportData.coverageB = serverAnalysis.coverageB;
      reportData.symmetric = true;
      reportData.matchingSections = serverAnalysis.matchingSections;
      reportData.differentSections = serverAnalysis.differentSections;
      reportData.matchingPhrases = serverAnalysis.matchingPhrases;
      reportData.spellingMistakes = serverAnalysis.spellingMistakes;
      reportData.filefirstmatches = serverAnalysis.filefirstmatches;
      reportData.filesecondmatches = serverAnalysis.filesecondmatches;
      reportData.commonPhrases = serverAnalysis.commonPhrases;
      reportData.spellingMistakesA = serverAnalysis.spellingMistakesA;
      reportData.spellingMistakesB = serverAnalysis.spellingMistakesB;
      reportData.disclaimer = serverAnalysis.disclaimer;
    }

    const created = await Report.create(reportData);
    res.status(201).json(formatDoc(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /reports/:id - Strictly enforces authentication and ownership
app.delete("/reports/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { customId: id }] }
      : { customId: id };

    const report = await Report.findOne(filter);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const isOwner = report.email && report.email.toLowerCase() === req.user.email.toLowerCase();
    const isTeacher = req.user.role === "teacher" || req.user.role === "admin";

    if (!isOwner && !isTeacher) {
      return res.status(403).json({ error: "Unauthorized: You do not own this report" });
    }

    await Report.findOneAndDelete(filter);
    res.json({ message: "Report deleted successfully", id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// FILEDATA ENDPOINTS (Protected with RBAC)
// -----------------------------------------
app.get("/filedata", authenticateToken, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "student") {
      query.email = req.user.email.toLowerCase();
    } else if (req.query.email) {
      query.email = req.query.email.toLowerCase().trim();
    }

    const data = await FileData.find(query).lean();
    res.json(data.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/filedata", authenticateToken, async (req, res) => {
  try {
    const item = { ...req.body };
    item.customId = req.body.id || new mongoose.Types.ObjectId().toString();
    item.email = req.user.email.toLowerCase();

    const created = await FileData.create(item);
    res.status(201).json(formatDoc(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/filedata/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { customId: id }] }
      : { customId: id };

    const existing = await FileData.findOne(filter);
    if (!existing) {
      return res.status(404).json({ error: "FileData not found" });
    }

    if (existing.email.toLowerCase() !== req.user.email.toLowerCase() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized: You do not own this file data" });
    }

    const updated = await FileData.findOneAndUpdate(filter, req.body, { new: true });
    res.json(formatDoc(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// FILERESULT ENDPOINTS (Protected with RBAC)
// -----------------------------------------
app.get("/fileresult", authenticateToken, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "student") {
      query.email = req.user.email.toLowerCase();
    } else if (req.query.email) {
      query.email = req.query.email.toLowerCase().trim();
    }

    const data = await FileResult.find(query).lean();
    res.json(data.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// UNIFIED PROFILE SUMMARY (Single ultra-fast round-trip for Profile page <50ms)
// -----------------------------------------
app.get("/api/user-profile-summary", authenticateToken, async (req, res) => {
  try {
    const email = (req.query.email && req.user.role !== "student")
      ? req.query.email.toLowerCase().trim()
      : req.user.email.toLowerCase();

    const [user, fileData, reports, fileResult] = await Promise.all([
      User.findOne({ email }).select("-password -resetToken -resetTokenExpiry").lean(),
      FileData.findOne({ email }).lean(),
      Report.find({ email }).sort({ date: -1 }).lean(),
      FileResult.findOne({ email }).lean()
    ]);

    res.json({
      success: true,
      user: formatDoc(user),
      fileData: formatDoc(fileData),
      reports: (reports || []).map(formatDoc),
      fileResult: formatDoc(fileResult)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/fileresult", authenticateToken, async (req, res) => {
  try {
    const item = { ...req.body };
    item.customId = req.body.id || new mongoose.Types.ObjectId().toString();
    item.email = req.user.email.toLowerCase();

    const created = await FileResult.create(item);
    res.status(201).json(formatDoc(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/fileresult/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { customId: id }] }
      : { customId: id };

    const existing = await FileResult.findOne(filter);
    if (!existing) {
      return res.status(404).json({ error: "FileResult not found" });
    }

    if (existing.email.toLowerCase() !== req.user.email.toLowerCase() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized: You do not own this file result" });
    }

    const updated = await FileResult.findOneAndUpdate(filter, req.body, { new: true });
    res.json(formatDoc(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// CONNECT MONGOOSE & START SERVER
// =========================================
if (require.main === module) {
  mongoose
    .connect(MONGODB_URI)
    .then(async () => {
      console.log("Connected to MongoDB successfully at:", MONGODB_URI.replace(/:([^:@]{3,})@/, ":***@"));
      await seedInitialDataIfEmpty();
      await rehashPlaintextPasswords();

      app.listen(PORT, () => {
        console.log(`AssignCheck Secure Backend running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB:", err.message);
      process.exit(1);
    });
}

module.exports = {
  app,
  User,
  Report,
  FileData,
  FileResult
};
