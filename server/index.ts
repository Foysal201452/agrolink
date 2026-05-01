import express from "express";
import cors from "cors";
import { z } from "zod";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  openDb,
  ensureAdminUser,
  type CropRow,
  type OrderLineRow,
  type OrderRow,
  type ScanEventRow,
  type ShipmentRow,
  type UserRole,
  type UserRow,
  type WarehouseRow,
} from "./db";

const PORT = Number(process.env.PORT ?? 5050);

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

const db = openDb();
ensureAdminUser(db);

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function makeId(prefix: string) {
  const n = Math.floor(Date.now() / 1000);
  const rand = Math.floor(Math.random() * 1000);
  return `${prefix}-${n}-${rand}`;
}

function formatDateLabel(d: Date) {
  const months = ["জানু", "ফেব", "মার্চ", "এপ্রি", "মে", "জুন", "জুল", "আগ", "সেপ্ট", "অক্ট", "নভে", "ডিসে"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function normalizeVillageName(v: string) {
  return (v || "").trim() || "অজানা গ্রাম";
}

function toApiCrop(r: CropRow) {
  return {
    id: r.id,
    name: r.name,
    farmer: r.farmer,
    location: r.location,
    price: r.price,
    unit: r.unit,
    rating: r.rating,
    harvest: r.harvest,
    category: r.category,
    image: r.image,
    active: r.active === 1,
  };
}

function pickCityWarehouseByArea(area: string): WarehouseRow {
  const exact = db
    .prepare(`SELECT * FROM warehouses WHERE kind = 'city' AND area = ? ORDER BY id ASC LIMIT 1`)
    .get(area) as WarehouseRow | undefined;
  if (exact) return exact;
  return db.prepare(`SELECT * FROM warehouses WHERE kind = 'city' ORDER BY id ASC LIMIT 1`).get() as WarehouseRow;
}

// -------------------------
// Demo auth (token sessions)
// -------------------------
type SessionUser = Pick<UserRow, "id" | "username" | "role" | "area" | "displayName" | "buyerName" | "farmerName">;
const sessions = new Map<string, SessionUser>();

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function rowToSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    area: row.area,
    displayName: row.displayName,
    buyerName: row.buyerName,
    farmerName: row.farmerName,
  };
}

function publicSessionUser(u: SessionUser) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    area: u.area,
    displayName: u.displayName,
    buyerName: u.buyerName,
    farmerName: u.farmerName,
  };
}

function optionalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = String(req.headers.authorization ?? "");
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const token = m?.[1];
  if (!token) {
    (req as any).user = undefined;
    return next();
  }
  const user = sessions.get(token);
  (req as any).user = user;
  return next();
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = String(req.headers.authorization ?? "");
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const token = m?.[1];
  if (!token) return res.status(401).json({ error: "Missing token" });
  const user = sessions.get(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });
  (req as any).user = user;
  return next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as SessionUser | undefined;
  if (!user) return res.status(401).json({ error: "Missing auth" });
  if (user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  return next();
}

function requireBuyerOrAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as SessionUser | undefined;
  if (!user) return res.status(401).json({ error: "Missing auth" });
  if (user.role !== "buyer" && user.role !== "admin") return res.status(403).json({ error: "Buyer or admin only" });
  return next();
}

function requireFarmerOrAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as SessionUser | undefined;
  if (!user) return res.status(401).json({ error: "Missing auth" });
  if (user.role !== "farmer" && user.role !== "admin") return res.status(403).json({ error: "Farmer or admin only" });
  return next();
}

function mapOrdersToApiOrders(orders: OrderRow[], lineFilter: (l: OrderLineRow) => boolean) {
  const allLines = db.prepare(`SELECT * FROM order_lines`).all() as OrderLineRow[];
  const linesByOrder = new Map<string, OrderLineRow[]>();
  for (const l of allLines) {
    if (!lineFilter(l)) continue;
    linesByOrder.set(l.orderId, [...(linesByOrder.get(l.orderId) ?? []), l]);
  }

  return orders
    .filter((o) => (linesByOrder.get(o.id)?.length ?? 0) > 0)
    .map((o) => {
      const orderLines = (linesByOrder.get(o.id) ?? []).map((l) => {
        const snap = safeParseJson<any>(l.snapshotJson) ?? {};
        return { cropId: l.cropId, qty: l.qty, snapshot: snap };
      });
      return { ...o, lines: orderLines };
    });
}

function mapShipmentsApi(shipments: ShipmentRow[]) {
  return shipments.map((s) => ({
    id: s.id,
    orderId: s.orderId,
    cargoUnits: s.cargoUnits,
    eta: s.eta,
    step: s.step,
    itemsLabel: s.itemsLabel,
    route: safeParseJson<any>(s.routeJson) ?? {},
    timeline: safeParseJson<any>(s.timelineJson) ?? [],
  }));
}

function buildBootstrapForUser(user?: SessionUser) {
  const crops = (db.prepare(`SELECT * FROM crops ORDER BY id DESC`).all() as CropRow[]).map(toApiCrop);
  const cityWarehouses = db
    .prepare(`SELECT * FROM warehouses WHERE kind = 'city' ORDER BY id ASC`)
    .all() as WarehouseRow[];

  if (!user || (user.role !== "admin" && user.role !== "buyer" && user.role !== "farmer")) {
    return { crops, orders: [] as ReturnType<typeof mapOrdersToApiOrders>, shipments: [] as ReturnType<typeof mapShipmentsApi>, warehouses: cityWarehouses };
  }

  if (user.role === "admin") {
    const orders = db.prepare(`SELECT * FROM orders ORDER BY createdAtMs DESC`).all() as OrderRow[];
    const shipments = db.prepare(`SELECT * FROM shipments ORDER BY createdAtMs DESC`).all() as ShipmentRow[];
    const warehouses = db.prepare(`SELECT * FROM warehouses ORDER BY kind DESC, id ASC`).all() as WarehouseRow[];
    const apiOrders = mapOrdersToApiOrders(orders, () => true);
    return { crops, orders: apiOrders, shipments: mapShipmentsApi(shipments), warehouses };
  }

  if (user.role === "buyer") {
    const bn = (user.buyerName ?? "").trim();
    if (!bn) {
      return { crops, orders: [], shipments: [], warehouses: cityWarehouses };
    }
    const orders = db.prepare(`SELECT * FROM orders WHERE buyerName = ? ORDER BY createdAtMs DESC`).all(bn) as OrderRow[];
    const orderIds = new Set(orders.map((o) => o.id));
    const shipments = (db.prepare(`SELECT * FROM shipments ORDER BY createdAtMs DESC`).all() as ShipmentRow[]).filter((s) =>
      orderIds.has(s.orderId),
    );
    const apiOrders = mapOrdersToApiOrders(orders, () => true);
    return { crops, orders: apiOrders, shipments: mapShipmentsApi(shipments), warehouses: cityWarehouses };
  }

  const farmer = (user.farmerName ?? "").trim();
  if (!farmer) {
    return { crops, orders: [], shipments: [], warehouses: cityWarehouses };
  }
  const orders = db.prepare(`SELECT * FROM orders ORDER BY createdAtMs DESC`).all() as OrderRow[];
  const apiOrders = mapOrdersToApiOrders(orders, (l) => {
    const snap = safeParseJson<any>(l.snapshotJson) ?? {};
    return String(snap.farmer ?? "").trim() === farmer;
  });
  const orderIds = new Set(apiOrders.map((o) => o.id));
  const shipments = (db.prepare(`SELECT * FROM shipments ORDER BY createdAtMs DESC`).all() as ShipmentRow[]).filter((s) =>
    orderIds.has(s.orderId),
  );
  return { crops, orders: apiOrders, shipments: mapShipmentsApi(shipments), warehouses: cityWarehouses };
}

const loginSchema = z.object({
  username: z.string().trim().min(1).max(40),
  password: z.string().trim().min(1).max(60),
});

const registerSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().trim().min(4).max(60),
  role: z.enum(["buyer", "farmer"]),
  displayName: z.string().trim().min(1).max(60),
  buyerName: z.string().trim().min(1).max(60).optional(),
  farmerName: z.string().trim().min(1).max(60).optional(),
});

app.post("/api/auth/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const { username, password } = parsed.data;
  const row = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username) as UserRow | undefined;
  if (!row || row.password !== password) return res.status(401).json({ error: "Invalid credentials" });

  const token = makeToken();
  const user = rowToSessionUser(row);
  sessions.set(token, user);
  res.json({ token, user: publicSessionUser(user) });
});

app.post("/api/auth/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const { username, password, role, displayName } = parsed.data;

  const buyerName = role === "buyer" ? (parsed.data.buyerName ?? displayName).trim() : null;
  const farmerName = role === "farmer" ? (parsed.data.farmerName ?? displayName).trim() : null;

  // Enforce stable identifiers for role-specific views
  if (role === "buyer" && !buyerName) return res.status(400).json({ error: "buyerName required" });
  if (role === "farmer" && !farmerName) return res.status(400).json({ error: "farmerName required" });

  const id = makeId("USR");
  const createdAtMs = Date.now();

  try {
    db.prepare(
      `INSERT INTO users (id, username, password, role, area, displayName, buyerName, farmerName, createdAtMs)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    ).run(id, username, password, role, displayName, buyerName, farmerName, createdAtMs);
  } catch {
    return res.status(409).json({ error: "Username already exists" });
  }

  const row = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username) as UserRow | undefined;
  if (!row) return res.status(500).json({ error: "Failed to load user" });

  const token = makeToken();
  const user = rowToSessionUser(row);
  sessions.set(token, user);
  res.status(201).json({ token, user: publicSessionUser(user) });
});

// -------------
// Health / Load
// -------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: "sqlite", time: Date.now() });
});

app.get("/api/bootstrap", optionalAuth, (req, res) => {
  const user = (req as any).user as SessionUser | undefined;
  res.json(buildBootstrapForUser(user));
});

// -----------------
// Admin (DB tables)
// -----------------
app.get("/api/admin/tables", requireAuth, requireAdmin, (_req, res) => {
  const crops = db.prepare(`SELECT * FROM crops ORDER BY id DESC`).all() as CropRow[];
  const orders = db.prepare(`SELECT * FROM orders ORDER BY createdAtMs DESC`).all() as OrderRow[];
  const orderLines = db.prepare(`SELECT * FROM order_lines ORDER BY orderId DESC`).all() as OrderLineRow[];
  const shipments = db.prepare(`SELECT * FROM shipments ORDER BY createdAtMs DESC`).all() as ShipmentRow[];
  const warehouses = db.prepare(`SELECT * FROM warehouses ORDER BY kind DESC, id ASC`).all() as WarehouseRow[];
  const scanEvents = db.prepare(`SELECT * FROM scan_events ORDER BY timestampMs DESC`).all() as ScanEventRow[];
  const users = (db.prepare(`SELECT * FROM users ORDER BY createdAtMs ASC`).all() as UserRow[]).map((u) => ({
    ...u,
    password: "****",
  }));

  res.json({
    crops,
    orders,
    order_lines: orderLines,
    shipments,
    warehouses,
    scan_events: scanEvents,
    users,
  });
});

app.post("/api/admin/clear-transactions", requireAuth, requireAdmin, (_req, res) => {
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM order_lines`).run();
    db.prepare(`DELETE FROM shipments`).run();
    db.prepare(`DELETE FROM orders`).run();
    db.prepare(`DELETE FROM scan_events`).run();
    db.prepare(`DELETE FROM warehouses WHERE kind = 'village'`).run();
  });
  tx();
  res.json({ ok: true });
});

app.post("/api/admin/normalize-crops", requireAuth, requireAdmin, (_req, res) => {
  const allowed = new Set(["ঢাকা", "চট্টগ্রাম", "খুলনা", "সিলেট"]);
  const rows = db.prepare(`SELECT id, location FROM crops`).all() as Array<{ id: number; location: string }>;
  const update = db.prepare(`UPDATE crops SET location = ? WHERE id = ?`);

  let changed = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      const loc = (r.location || "").trim();
      if (!allowed.has(loc)) {
        update.run("ঢাকা", r.id);
        changed++;
      }
    }
  });
  tx();
  res.json({ ok: true, changed });
});

app.post("/api/admin/rebalance-crops", requireAuth, requireAdmin, (_req, res) => {
  const cycle = ["ঢাকা", "চট্টগ্রাম", "খুলনা", "সিলেট"] as const;
  const rows = db.prepare(`SELECT id FROM crops ORDER BY id ASC`).all() as Array<{ id: number }>;
  const update = db.prepare(`UPDATE crops SET location = ? WHERE id = ?`);

  let changed = 0;
  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i]!.id;
      const nextLoc = cycle[i % cycle.length]!;
      update.run(nextLoc, id);
      changed++;
    }
  });
  tx();
  res.json({ ok: true, changed });
});

app.post("/api/admin/clear-village-warehouses", requireAuth, requireAdmin, (_req, res) => {
  const info = db.prepare(`DELETE FROM warehouses WHERE kind = 'village'`).run();
  res.json({ ok: true, deleted: info.changes });
});

// --------
// Crops
// --------
app.get("/api/crops", (req, res) => {
  const activeOnly = req.query.activeOnly === "1" || req.query.activeOnly === "true";
  const rows = activeOnly
    ? (db.prepare(`SELECT * FROM crops WHERE active = 1 ORDER BY id DESC`).all() as CropRow[])
    : (db.prepare(`SELECT * FROM crops ORDER BY id DESC`).all() as CropRow[]);
  res.json({ crops: rows.map(toApiCrop) });
});

const createCropSchema = z.object({
  name: z.string().trim().min(1).max(80),
  farmer: z.string().trim().min(1).max(60),
  location: z.string().trim().min(1).max(60),
  price: z.number().finite().positive(),
  unit: z.string().trim().min(1).max(20),
  rating: z.number().finite().min(0).max(5).optional(),
  harvest: z.string().trim().min(1).max(30),
  category: z.enum(["Vegetables", "Fruits", "Grains"]),
  image: z.string().trim().min(1).max(200),
});

app.post("/api/crops", requireAuth, requireFarmerOrAdmin, (req, res) => {
  const parsed = createCropSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  const user = (req as any).user as SessionUser;
  const p = parsed.data;
  if (user.role === "farmer") {
    const acc = (user.farmerName ?? "").trim();
    if (!acc || p.farmer.trim() !== acc) {
      return res.status(403).json({ error: "Farmer name must match your account" });
    }
  }

  const createdAtMs = Date.now();
  const rating = p.rating ?? 4.5;

  const info = db
    .prepare(
      `
      INSERT INTO crops
        (name, farmer, location, price, unit, rating, harvest, category, image, active, createdAtMs)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `,
    )
    .run(p.name, p.farmer, p.location, p.price, p.unit, rating, p.harvest, p.category, p.image, createdAtMs);

  const row = db.prepare(`SELECT * FROM crops WHERE id = ?`).get(info.lastInsertRowid) as CropRow | undefined;
  if (!row) return res.status(500).json({ error: "Failed to load inserted row" });
  res.status(201).json({ crop: toApiCrop(row) });
});

const updateCropSchema = z.object({
  active: z.boolean().optional(),
  price: z.number().finite().positive().optional(),
});

app.patch("/api/crops/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateCropSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  const p = parsed.data;

  const user = (req as any).user as SessionUser;
  const existing = db.prepare(`SELECT * FROM crops WHERE id = ?`).get(id) as CropRow | undefined;
  if (!existing) return res.status(404).json({ error: "Not found" });

  if (user.role === "farmer") {
    const acc = (user.farmerName ?? "").trim();
    if (!acc || existing.farmer.trim() !== acc) return res.status(403).json({ error: "Not your listing" });
  } else if (user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const nextActive = p.active === undefined ? existing.active : p.active ? 1 : 0;
  const nextPrice = p.price === undefined ? existing.price : p.price;

  db.prepare(`UPDATE crops SET active = ?, price = ? WHERE id = ?`).run(nextActive, nextPrice, id);

  const row = db.prepare(`SELECT * FROM crops WHERE id = ?`).get(id) as CropRow | undefined;
  if (!row) return res.status(500).json({ error: "Failed to load updated row" });

  res.json({ crop: toApiCrop(row) });
});

// --------
// Orders
// --------
const createOrderSchema = z.object({
  buyerName: z.string().trim().min(1).max(60),
  buyerArea: z.enum(["ঢাকা", "চট্টগ্রাম", "খুলনা", "সিলেট"]),
  cart: z
    .array(
      z.object({
        cropId: z.number().int().positive(),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
});

app.post("/api/orders", requireAuth, requireBuyerOrAdmin, (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  const user = (req as any).user as SessionUser;
  const { buyerName, buyerArea, cart } = parsed.data;
  if (user.role === "buyer") {
    const acc = (user.buyerName ?? "").trim();
    if (!acc || buyerName.trim() !== acc) {
      return res.status(403).json({ error: "Buyer name must match your account" });
    }
  }
  const now = new Date();
  const createdAtMs = now.getTime();
  const orderId = makeId("ORD");

  const cropById = new Map<number, CropRow>();
  for (const { cropId } of cart) {
    const crop = db.prepare(`SELECT * FROM crops WHERE id = ?`).get(cropId) as CropRow | undefined;
    if (!crop) return res.status(400).json({ error: `Unknown cropId ${cropId}` });
    cropById.set(cropId, crop);
  }

  const orderLines = cart.map(({ cropId, qty }) => {
    const crop = cropById.get(cropId)!;
    return {
      orderId,
      cropId,
      qty,
      snapshotJson: JSON.stringify({
        name: crop.name,
        farmer: crop.farmer,
        price: crop.price,
        unit: crop.unit,
        location: crop.location,
        image: crop.image,
      }),
    } satisfies OrderLineRow;
  });

  const itemsLabel = orderLines
    .map((l) => {
      const snap = safeParseJson<any>(l.snapshotJson) ?? {};
      return `${snap.name ?? "পণ্য"} (${l.qty}${snap.unit ?? ""})`;
    })
    .join(", ");

  const origins = Array.from(new Set(orderLines.map((l) => (safeParseJson<any>(l.snapshotJson)?.location as string) ?? ""))).filter(Boolean);
  const originArea = origins.length === 1 ? origins[0]! : "বহু ডিপো";
  const originWarehouse = origins.length === 1 ? pickCityWarehouseByArea(originArea) : pickCityWarehouseByArea(buyerArea);
  const destWarehouse = pickCityWarehouseByArea(buyerArea);

  const cargoUnits = Math.max(1, cart.reduce((sum, l) => sum + l.qty, 0));
  const shipmentId = makeId("SH");

  const route = {
    village: normalizeVillageName(originArea),
    villageHub: originWarehouse.name,
    cityHub: destWarehouse.name,
    city: `${buyerArea} বাজার`,
  };

  const shipment: ShipmentRow = {
    id: shipmentId,
    orderId,
    cargoUnits,
    step: "Collected",
    eta: "4h 00m",
    itemsLabel,
    routeJson: JSON.stringify(route),
    timelineJson: JSON.stringify([{ step: "Collected", timeLabel: formatDateLabel(now) }]),
    createdAtMs,
  };

  const order: OrderRow = {
    id: orderId,
    buyerName,
    createdAtMs,
    dateLabel: formatDateLabel(now),
    status: "Processing",
  };

  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO orders (id, buyerName, createdAtMs, dateLabel, status) VALUES (?, ?, ?, ?, ?)`).run(
      order.id,
      order.buyerName,
      order.createdAtMs,
      order.dateLabel,
      order.status,
    );
    const insLine = db.prepare(`INSERT INTO order_lines (orderId, cropId, qty, snapshotJson) VALUES (?, ?, ?, ?)`);
    for (const l of orderLines) insLine.run(l.orderId, l.cropId, l.qty, l.snapshotJson);

    db.prepare(
      `INSERT INTO shipments (id, orderId, cargoUnits, eta, step, itemsLabel, routeJson, timelineJson, createdAtMs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      shipment.id,
      shipment.orderId,
      shipment.cargoUnits,
      shipment.eta,
      shipment.step,
      shipment.itemsLabel,
      shipment.routeJson,
      shipment.timelineJson,
      shipment.createdAtMs,
    );
  });
  tx();

  const lines = db.prepare(`SELECT * FROM order_lines WHERE orderId = ?`).all(orderId) as OrderLineRow[];
  res.status(201).json({
    order: {
      ...order,
      lines: lines.map((l) => ({ cropId: l.cropId, qty: l.qty, snapshot: safeParseJson<any>(l.snapshotJson) ?? {} })),
    },
    shipment: {
      id: shipment.id,
      orderId: shipment.orderId,
      cargoUnits: shipment.cargoUnits,
      eta: shipment.eta,
      step: shipment.step,
      itemsLabel: shipment.itemsLabel,
      route,
      timeline: safeParseJson<any>(shipment.timelineJson) ?? [],
    },
  });
});

function nextShipmentStep(step: string) {
  return step === "Collected"
    ? "At Village Hub"
    : step === "At Village Hub"
      ? "In Transit"
      : step === "In Transit"
        ? "At City Hub"
        : step === "At City Hub"
          ? "Out for Delivery"
          : step === "Out for Delivery"
            ? "Delivered"
            : "Delivered";
}

app.post("/api/shipments/:id/advance", requireAuth, requireAdmin, (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const existing = db.prepare(`SELECT * FROM shipments WHERE id = ?`).get(id) as ShipmentRow | undefined;
  if (!existing) return res.status(404).json({ error: "Not found" });

  const next = nextShipmentStep(existing.step);
  const now = new Date();

  const timeline = safeParseJson<any[]>(existing.timelineJson) ?? [];
  const nextTimeline = [...timeline, { step: next, timeLabel: formatDateLabel(now) }];

  const nextOrderStatus =
    next === "At Village Hub"
      ? "Processing"
      : next === "In Transit" || next === "At City Hub" || next === "Out for Delivery"
        ? "In Transit"
        : next === "Delivered"
          ? "Delivered"
          : "Processing";

  const route = safeParseJson<any>(existing.routeJson) ?? {};
  const delta = existing.cargoUnits;
  const originCity = db
    .prepare(`SELECT * FROM warehouses WHERE kind = 'city' AND area = ?`)
    .get(route.village ?? "") as WarehouseRow | undefined;
  const originId = originCity?.id;
  const destCity = db.prepare(`SELECT * FROM warehouses WHERE name = ?`).get(route.cityHub ?? "") as WarehouseRow | undefined;
  const destId = destCity?.id;

  const bump = (warehouseId: string, add: number) => {
    const w = db.prepare(`SELECT * FROM warehouses WHERE id = ?`).get(warehouseId) as WarehouseRow | undefined;
    if (!w) return;
    db.prepare(`UPDATE warehouses SET items = ? WHERE id = ?`).run(Math.max(0, w.items + add), warehouseId);
  };

  const tx = db.transaction(() => {
    db.prepare(`UPDATE shipments SET step = ?, eta = ?, timelineJson = ? WHERE id = ?`).run(
      next,
      next === "Delivered" ? "—" : existing.eta,
      JSON.stringify(nextTimeline),
      id,
    );
    db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(nextOrderStatus, existing.orderId);

    if (next === "At Village Hub" && originId) bump(originId, +delta);
    else if (next === "In Transit" && originId) bump(originId, -delta);
    else if (next === "At City Hub" && destId) bump(destId, +delta);
    else if (next === "Out for Delivery" && destId) bump(destId, -delta);
  });
  tx();

  const updated = db.prepare(`SELECT * FROM shipments WHERE id = ?`).get(id) as ShipmentRow;
  const updatedOrder = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(updated.orderId) as OrderRow;
  const warehouses = db.prepare(`SELECT * FROM warehouses`).all() as WarehouseRow[];

  res.json({
    shipment: {
      id: updated.id,
      orderId: updated.orderId,
      cargoUnits: updated.cargoUnits,
      eta: updated.eta,
      step: updated.step,
      itemsLabel: updated.itemsLabel,
      route: safeParseJson<any>(updated.routeJson) ?? {},
      timeline: safeParseJson<any>(updated.timelineJson) ?? [],
    },
    order: updatedOrder,
    warehouses,
  });
});

// -----
// Scan
// -----
const scanSchema = z.object({
  orderId: z.string().trim().min(3).max(80),
});

app.post("/api/scan", requireAuth, requireAdmin, (req, res) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const user = (req as any).user as SessionUser;
  const orderId = parsed.data.orderId;

  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as OrderRow | undefined;
  if (!order) return res.status(404).json({ error: "Order not found" });

  const shipment = db.prepare(`SELECT * FROM shipments WHERE orderId = ?`).get(orderId) as ShipmentRow | undefined;
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  const route = safeParseJson<any>(shipment.routeJson) ?? {};

  let nextStep: ShipmentRow["step"] = shipment.step;
  let nextOrderStatus: OrderRow["status"] = order.status;
  let action = "";

  // Admin-only tool: for demo allow admin to choose action by scanning QR.
  // Default behavior: mark as "Out for Delivery" to show progress.
  nextStep = "Out for Delivery";
  nextOrderStatus = "In Transit";
  action = "SCAN_ADMIN";

  const event: ScanEventRow = {
    id: makeId("SE"),
    orderId,
    shipmentId: shipment.id,
    scannedByUserId: user.id,
    role: user.role as UserRole,
    area: user.area ?? null,
    timestampMs: Date.now(),
    action,
  };

  const tx = db.transaction(() => {
    db.prepare(`UPDATE shipments SET step = ?, routeJson = ? WHERE id = ?`).run(nextStep, JSON.stringify(route), shipment.id);
    db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(nextOrderStatus, orderId);
    db.prepare(
      `INSERT INTO scan_events (id, orderId, shipmentId, scannedByUserId, role, area, timestampMs, action)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(event.id, event.orderId, event.shipmentId, event.scannedByUserId, event.role, event.area, event.timestampMs, event.action);
  });
  tx();

  const updatedOrder = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as OrderRow;
  const updatedShipment = db.prepare(`SELECT * FROM shipments WHERE id = ?`).get(shipment.id) as ShipmentRow;
  const warehouses = db.prepare(`SELECT * FROM warehouses`).all() as WarehouseRow[];
  const lines = db.prepare(`SELECT * FROM order_lines WHERE orderId = ?`).all(orderId) as OrderLineRow[];

  res.json({
    order: {
      ...updatedOrder,
      lines: lines.map((l) => ({ cropId: l.cropId, qty: l.qty, snapshot: safeParseJson<any>(l.snapshotJson) ?? {} })),
    },
    shipment: {
      id: updatedShipment.id,
      orderId: updatedShipment.orderId,
      cargoUnits: updatedShipment.cargoUnits,
      eta: updatedShipment.eta,
      step: updatedShipment.step,
      itemsLabel: updatedShipment.itemsLabel,
      route: safeParseJson<any>(updatedShipment.routeJson) ?? {},
      timeline: safeParseJson<any>(updatedShipment.timelineJson) ?? [],
    },
    warehouses,
    event,
  });
});

// -------------------------
// Serve web build on Railway
// -------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[agrolink] API server listening on http://127.0.0.1:${PORT}`);
});

