// server.js
// Express + MongoDB backend for AssignCheck
// Connects to local MongoDB and handles Users, Reports, FileData, and FileResult

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/assigncheck";

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// =========================================
// MONGOOSE SCHEMAS & MODELS
// =========================================

// 1. User Schema
const userSchema = new mongoose.Schema(
  {
    customId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
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
    customId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    email: { type: String, required: true, lowercase: true, trim: true },
    files: [{ type: String }],
    type: { type: String, default: "student" },
    similarity: { type: Number, default: 0 },
    matchingSections: { type: Number, default: 0 },
    differentSections: { type: Number, default: 0 },
    matchingPhrases: { type: Number, default: 0 },
    spellingMistakes: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    textA: { type: String, default: "" },
    textB: { type: String, default: "" },
    filefirstmatches: { type: Array, default: [] },
    filesecondmatches: { type: Array, default: [] },
    commonPhrases: { type: Array, default: [] },
    spellingMistakesA: { type: Array, default: [] },
    spellingMistakesB: { type: Array, default: [] },
    allSpellingMistakes: { type: Array, default: [] }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reportSchema.virtual("id").get(function () {
  return this.customId || this._id.toString();
});

const Report = mongoose.model("Report", reportSchema);

// 3. FileData Schema
const fileDataSchema = new mongoose.Schema(
  {
    customId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    email: { type: String, required: true, lowercase: true, trim: true },
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
    customId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    email: { type: String, required: true, lowercase: true, trim: true },
    filesprocesed: { type: Array, default: [] }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

fileResultSchema.virtual("id").get(function () {
  return this.customId || this._id.toString();
});

const FileResult = mongoose.model("FileResult", fileResultSchema);

// Helper to format document with id
function formatDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = doc.customId || (doc._id ? doc._id.toString() : doc.id);
  delete obj.__v;
  return obj;
}

// =========================================
// DATA SEED / MIGRATION FROM db.json
// =========================================
async function seedInitialDataIfEmpty() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log("MongoDB already has data. Skipping migration.");
      return;
    }

    const dbJsonPath = path.join(__dirname, "db.json");
    if (!fs.existsSync(dbJsonPath)) return;

    const raw = fs.readFileSync(dbJsonPath, "utf-8");
    const data = JSON.parse(raw);

    // 1. Seed Users
    if (Array.isArray(data.users) && data.users.length > 0) {
      for (const u of data.users) {
        await User.create({
          customId: u.id,
          name: u.name,
          email: u.email,
          password: u.password
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
// USERS ENDPOINTS
// -----------------------------------------
app.get("/users", async (req, res) => {
  try {
    const query = {};
    if (req.query.email) {
      query.email = req.query.email.toLowerCase().trim();
    }
    const users = await User.find(query);
    res.json(users.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ customId: id });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(formatDoc(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const newUser = await User.create({
      customId: req.body.id || new mongoose.Types.ObjectId().toString(),
      name: name || "User",
      email: cleanEmail,
      password: password
    });

    res.status(201).json(formatDoc(newUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { customId: id }] }
      : { customId: id };

    const update = { ...req.body };
    delete update._id;

    const updated = await User.findOneAndUpdate(filter, update, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(formatDoc(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// REPORTS ENDPOINTS
// -----------------------------------------
app.get("/reports", async (req, res) => {
  try {
    const query = {};
    if (req.query.email) {
      query.email = req.query.email.toLowerCase().trim();
    }
    const reports = await Report.find(query).sort({ date: -1 });
    res.json(reports.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/reports/:id", async (req, res) => {
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
    res.json(formatDoc(report));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/reports", async (req, res) => {
  try {
    const reportData = { ...req.body };
    reportData.customId = req.body.id || new mongoose.Types.ObjectId().toString();
    if (reportData.email) {
      reportData.email = reportData.email.toLowerCase().trim();
    }

    const created = await Report.create(reportData);
    res.status(201).json(formatDoc(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/reports/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { customId: id }] }
      : { customId: id };

    const deleted = await Report.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json({ message: "Report deleted successfully", id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// FILEDATA ENDPOINTS
// -----------------------------------------
app.get("/filedata", async (req, res) => {
  try {
    const query = {};
    if (req.query.email) {
      query.email = req.query.email.toLowerCase().trim();
    }
    const data = await FileData.find(query);
    res.json(data.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/filedata", async (req, res) => {
  try {
    const item = { ...req.body };
    item.customId = req.body.id || new mongoose.Types.ObjectId().toString();
    if (item.email) item.email = item.email.toLowerCase().trim();

    const created = await FileData.create(item);
    res.status(201).json(formatDoc(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/filedata/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { customId: id }] }
      : { customId: id };

    const updated = await FileData.findOneAndUpdate(filter, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "FileData not found" });
    }
    res.json(formatDoc(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// FILERESULT ENDPOINTS
// -----------------------------------------
app.get("/fileresult", async (req, res) => {
  try {
    const query = {};
    if (req.query.email) {
      query.email = req.query.email.toLowerCase().trim();
    }
    const data = await FileResult.find(query);
    res.json(data.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/fileresult", async (req, res) => {
  try {
    const item = { ...req.body };
    item.customId = req.body.id || new mongoose.Types.ObjectId().toString();
    if (item.email) item.email = item.email.toLowerCase().trim();

    const created = await FileResult.create(item);
    res.status(201).json(formatDoc(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/fileresult/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { customId: id }] }
      : { customId: id };

    const updated = await FileResult.findOneAndUpdate(filter, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "FileResult not found" });
    }
    res.json(formatDoc(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// CONNECT MONGOOSE & START SERVER
// =========================================
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB successfully at:", MONGODB_URI);
    await seedInitialDataIfEmpty();

    app.listen(PORT, () => {
      console.log(`AssignCheck MongoDB Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
