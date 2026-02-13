import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./db.js";

const app = express();
const PORT = 5174;
const JWT_SECRET = process.env.JWT_SECRET || "vaanibill_dev_secret";
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    }
  })
);
app.use(express.json());

const asyncHandler = (handler) => (req, res) =>
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  });

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.post(
  "/api/auth/signup",
  asyncHandler(async (req, res) => {
  const { username, password, businessName } = req.body || {};
  if (!username || !password || !businessName) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const db = await getDb();
  const existing = await db.get("SELECT id FROM users WHERE username = ?", username);
  if (existing) {
    return res.status(409).json({ message: "Username already exists" });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();
  const result = await db.run(
    "INSERT INTO users (username, password_hash, business_name, created_at) VALUES (?, ?, ?, ?)",
    username,
    passwordHash,
    businessName,
    createdAt
  );
  const user = { id: result.lastID, username };
  const token = signToken(user);
  return res.json({ token, businessName });
  })
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  const db = await getDb();
  const user = await db.get(
    "SELECT id, username, password_hash, business_name FROM users WHERE username = ?",
    username
  );
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = signToken(user);
  return res.json({ token, businessName: user.business_name });
  })
);

app.get(
  "/api/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
  const db = await getDb();
  const user = await db.get(
    "SELECT username, business_name FROM users WHERE id = ?",
    req.user.sub
  );
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json({ username: user.username, businessName: user.business_name });
  })
);

app.get(
  "/api/products",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const products = await db.all(
      "SELECT id, name_en as nameEn, name_gu as nameGu, rate FROM products WHERE user_id = ? ORDER BY created_at DESC",
      req.user.sub
    );
    return res.json(products);
  })
);

app.post(
  "/api/products",
  authMiddleware,
  asyncHandler(async (req, res) => {
  const { nameEn, nameGu, rate } = req.body || {};
  if (!nameEn || typeof rate !== "number") {
    return res.status(400).json({ message: "English name and numeric rate required" });
  }
  const db = await getDb();
  const trimmedNameEn = nameEn.trim();
  const trimmedNameGu = typeof nameGu === "string" ? nameGu.trim() : "";
  const exists = await db.get(
    "SELECT id FROM products WHERE user_id = ? AND lower(name_en) = lower(?)",
    req.user.sub,
    trimmedNameEn
  );
  if (exists) {
    return res.status(400).json({ message: "Product already exists" });
  }
  const createdAt = new Date().toISOString();
  const result = await db.run(
    "INSERT INTO products (user_id, name_en, name_gu, rate, created_at) VALUES (?, ?, ?, ?, ?)",
    req.user.sub,
    trimmedNameEn,
    trimmedNameGu,
    rate,
    createdAt
  );
  return res.json({ id: result.lastID });
  })
);

app.put(
  "/api/products/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
  const { nameEn, nameGu, rate } = req.body || {};
  const id = Number(req.params.id);
  if (!nameEn || typeof rate !== "number") {
    return res.status(400).json({ message: "English name and numeric rate required" });
  }
  const db = await getDb();
  const trimmedNameEn = nameEn.trim();
  const trimmedNameGu = typeof nameGu === "string" ? nameGu.trim() : "";
  const conflict = await db.get(
    "SELECT id FROM products WHERE user_id = ? AND id != ? AND lower(name_en) = lower(?)",
    req.user.sub,
    id,
    trimmedNameEn
  );
  if (conflict) {
    return res.status(400).json({ message: "English name already exists" });
  }
  const product = await db.get(
    "SELECT id FROM products WHERE id = ? AND user_id = ?",
    id,
    req.user.sub
  );
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  await db.run(
    "UPDATE products SET name_en = ?, name_gu = ?, rate = ? WHERE id = ? AND user_id = ?",
    trimmedNameEn,
    trimmedNameGu,
    rate,
    id,
    req.user.sub
  );
  return res.json({ ok: true });
  })
);

app.delete(
  "/api/products/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  const result = await db.run(
    "DELETE FROM products WHERE id = ? AND user_id = ?",
    id,
    req.user.sub
  );
  if (result.changes === 0) {
    return res.status(404).json({ message: "Product not found" });
  }
  return res.json({ ok: true });
  })
);

app.post(
  "/api/bills",
  authMiddleware,
  asyncHandler(async (req, res) => {
  const { items, total } = req.body || {};
  if (!Array.isArray(items) || items.length === 0 || typeof total !== "number") {
    return res.status(400).json({ message: "Bill items and total are required" });
  }

  const validItems = items.every(
    (item) =>
      item &&
      typeof item.name === "string" &&
      typeof item.rate === "number" &&
      typeof item.quantity === "number" &&
      typeof item.total === "number"
  );
  if (!validItems) {
    return res.status(400).json({ message: "Invalid bill items" });
  }

  const db = await getDb();
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const dateKey = `${day}${month}${year}`;
  const existingCountRow = await db.get(
    "SELECT COUNT(*) as count FROM bills WHERE user_id = ? AND bill_number LIKE ?",
    req.user.sub,
    `BILL${dateKey}_%`
  );
  const existingCount = existingCountRow?.count || 0;
  const billNumber = `BILL${dateKey}_${existingCount + 1}`;
  const createdAt = new Date().toISOString();
  const billResult = await db.run(
    "INSERT INTO bills (user_id, bill_number, total, created_at) VALUES (?, ?, ?, ?)",
    req.user.sub,
    billNumber,
    total,
    createdAt
  );
  const billId = billResult.lastID;
  const stmt = await db.prepare(
    "INSERT INTO bill_items (bill_id, name, rate, quantity, total) VALUES (?, ?, ?, ?, ?)"
  );
  try {
    for (const item of items) {
      await stmt.run(billId, item.name, item.rate, item.quantity, item.total);
    }
  } finally {
    await stmt.finalize();
  }
  return res.json({ id: billId, billNumber });
  })
);

app.get(
  "/api/bills",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const bills = await db.all(
      "SELECT id, bill_number as billNumber, created_at as createdAt, total FROM bills WHERE user_id = ? ORDER BY created_at DESC",
      req.user.sub
    );
    const result = [];
    for (const bill of bills) {
      const items = await db.all(
        "SELECT name, rate, quantity, total FROM bill_items WHERE bill_id = ?",
        bill.id
      );
      result.push({ ...bill, items });
    }
    return res.json(result);
  })
);

app.put(
  "/api/bills/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { items, total } = req.body || {};
  if (!Array.isArray(items) || items.length === 0 || typeof total !== "number") {
    return res.status(400).json({ message: "Bill items and total are required" });
  }
  const validItems = items.every(
    (item) =>
      item &&
      typeof item.name === "string" &&
      typeof item.rate === "number" &&
      typeof item.quantity === "number" &&
      typeof item.total === "number"
  );
  if (!validItems) {
    return res.status(400).json({ message: "Invalid bill items" });
  }

  const db = await getDb();
  const bill = await db.get(
    "SELECT id FROM bills WHERE id = ? AND user_id = ?",
    id,
    req.user.sub
  );
  if (!bill) {
    return res.status(404).json({ message: "Bill not found" });
  }
  await db.run("UPDATE bills SET total = ? WHERE id = ? AND user_id = ?", total, id, req.user.sub);
  await db.run("DELETE FROM bill_items WHERE bill_id = ?", id);
  const stmt = await db.prepare(
    "INSERT INTO bill_items (bill_id, name, rate, quantity, total) VALUES (?, ?, ?, ?, ?)"
  );
  try {
    for (const item of items) {
      await stmt.run(id, item.name, item.rate, item.quantity, item.total);
    }
  } finally {
    await stmt.finalize();
  }
  return res.json({ ok: true });
  })
);

app.delete(
  "/api/bills/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDb();
  const result = await db.run(
    "DELETE FROM bills WHERE id = ? AND user_id = ?",
    id,
    req.user.sub
  );
  if (result.changes === 0) {
    return res.status(404).json({ message: "Bill not found" });
  }
  return res.json({ ok: true });
  })
);

app.get(
  "/api/reports",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const bills = await db.all(
      "SELECT id, total, created_at as createdAt FROM bills WHERE user_id = ?",
      req.user.sub
    );
    const billItems = await db.all(
      "SELECT bill_id as billId, name, quantity, total FROM bill_items WHERE bill_id IN (SELECT id FROM bills WHERE user_id = ?)",
      req.user.sub
    );
    const itemsByBill = new Map();
    billItems.forEach((item) => {
      const list = itemsByBill.get(item.billId) || [];
      list.push(item);
      itemsByBill.set(item.billId, list);
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const isSameOrAfter = (date, start) => date.getTime() >= start.getTime();

    const totals = { all: 0, today: 0, week: 0 };
    const counts = { bills: bills.length, items: 0, todayBills: 0, weekBills: 0 };
    const topItems = new Map();

    bills.forEach((bill) => {
      const createdAt = new Date(bill.createdAt);
      totals.all += bill.total;
      if (isSameOrAfter(createdAt, startOfToday)) {
        totals.today += bill.total;
        counts.todayBills += 1;
      }
      if (isSameOrAfter(createdAt, startOfWeek)) {
        totals.week += bill.total;
        counts.weekBills += 1;
      }
      const items = itemsByBill.get(bill.id) || [];
      items.forEach((item) => {
        counts.items += item.quantity;
        const key = item.name.toLowerCase();
        const existing = topItems.get(key) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        topItems.set(key, existing);
      });
    });

    const top = Array.from(topItems.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return res.json({ totals, counts, topItems: top });
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, "..", "dist");
app.use(express.static(clientDir));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`VaaniBill server running on http://localhost:${PORT}`);
});
