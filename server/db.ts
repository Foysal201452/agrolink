import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export type CropCategoryKey = "Vegetables" | "Fruits" | "Grains";
export type OrderStatusKey = "Processing" | "In Transit" | "Delivered" | "Completed";
export type ShipmentStepKey =
  | "Collected"
  | "At Village Hub"
  | "In Transit"
  | "At City Hub"
  | "Out for Delivery"
  | "Delivered";
export type WarehouseKind = "village" | "city";
export type UserRole = "admin" | "buyer" | "farmer" | "depo" | "delivery";

export type CropRow = {
  id: number;
  name: string;
  farmer: string;
  location: string;
  price: number;
  unit: string;
  rating: number;
  harvest: string;
  category: CropCategoryKey;
  image: string;
  active: 0 | 1;
  createdAtMs: number;
};

export type OrderRow = {
  id: string;
  buyerName: string;
  createdAtMs: number;
  dateLabel: string;
  status: OrderStatusKey;
};

export type OrderLineRow = {
  orderId: string;
  cropId: number;
  qty: number;
  snapshotJson: string;
};

export type ShipmentRow = {
  id: string;
  orderId: string;
  cargoUnits: number;
  eta: string;
  step: ShipmentStepKey;
  itemsLabel: string;
  routeJson: string;
  timelineJson: string;
  createdAtMs: number;
};

export type WarehouseRow = {
  id: string;
  name: string;
  kind: WarehouseKind;
  area: string;
  temp: string;
  maxItems: number;
  items: number;
  createdAtMs: number;
};

export type UserRow = {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  area: string | null;
  displayName: string | null;
  buyerName: string | null;
  farmerName: string | null;
  createdAtMs: number;
};

export type ScanEventRow = {
  id: string;
  orderId: string;
  shipmentId: string | null;
  scannedByUserId: string;
  role: UserRole;
  area: string | null;
  timestampMs: number;
  action: string;
};

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function openDb() {
  const dataDir = path.resolve(process.cwd(), "server", "data");
  ensureDir(dataDir);
  const dbPath = path.join(dataDir, "agrolink.sqlite");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Migrations (must run before app logic that inserts rows)
  migrateAuthRoleConstraints(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS crops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      farmer TEXT NOT NULL,
      location TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT NOT NULL,
      rating REAL NOT NULL,
      harvest TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Vegetables','Fruits','Grains')),
      image TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
      createdAtMs INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crops_active ON crops(active);
    CREATE INDEX IF NOT EXISTS idx_crops_farmer ON crops(farmer);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      buyerName TEXT NOT NULL,
      createdAtMs INTEGER NOT NULL,
      dateLabel TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Processing','In Transit','Delivered','Completed'))
    );
    CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAtMs);

    CREATE TABLE IF NOT EXISTS order_lines (
      orderId TEXT NOT NULL,
      cropId INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      snapshotJson TEXT NOT NULL,
      FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_order_lines_orderId ON order_lines(orderId);

    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      cargoUnits INTEGER NOT NULL,
      eta TEXT NOT NULL,
      step TEXT NOT NULL CHECK (step IN ('Collected','At Village Hub','In Transit','At City Hub','Out for Delivery','Delivered')),
      itemsLabel TEXT NOT NULL,
      routeJson TEXT NOT NULL,
      timelineJson TEXT NOT NULL,
      createdAtMs INTEGER NOT NULL,
      FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_shipments_step ON shipments(step);
    CREATE INDEX IF NOT EXISTS idx_shipments_orderId ON shipments(orderId);

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('village','city')),
      area TEXT NOT NULL,
      temp TEXT NOT NULL,
      maxItems INTEGER NOT NULL,
      items INTEGER NOT NULL,
      createdAtMs INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_warehouses_kind ON warehouses(kind);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','buyer','farmer','depo','delivery')),
      area TEXT NULL,
      displayName TEXT NULL,
      buyerName TEXT NULL,
      farmerName TEXT NULL,
      createdAtMs INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS scan_events (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      shipmentId TEXT NULL,
      scannedByUserId TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','depo','delivery')),
      area TEXT NULL,
      timestampMs INTEGER NOT NULL,
      action TEXT NOT NULL,
      FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(shipmentId) REFERENCES shipments(id) ON DELETE SET NULL,
      FOREIGN KEY(scannedByUserId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_scan_events_orderId ON scan_events(orderId);
    CREATE INDEX IF NOT EXISTS idx_scan_events_time ON scan_events(timestampMs);
  `);

  const count = db.prepare(`SELECT COUNT(1) as n FROM crops`).get() as { n: number };
  if ((count?.n ?? 0) === 0) seedCrops(db);

  const whCount = db.prepare(`SELECT COUNT(1) as n FROM warehouses`).get() as { n: number };
  if ((whCount?.n ?? 0) === 0) seedWarehouses(db);
  ensureCityWarehouses(db);
  normalizeCropLocations(db);
  migrateUsersProfileColumns(db);
  seedUsers(db);
  ensureBuyerFarmerDemoUsers(db);

  return db;
}

function migrateAuthRoleConstraints(db: Database.Database) {
  // SQLite doesn't allow altering CHECK constraints; rebuild tables if needed.
  const usersSql = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`)
    .get() as { sql?: string } | undefined;
  const scanSql = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='scan_events'`)
    .get() as { sql?: string } | undefined;

  const needsUsers =
    typeof usersSql?.sql === "string" && usersSql.sql.includes("role IN ('depo','delivery')");
  const needsScan =
    typeof scanSql?.sql === "string" && scanSql.sql.includes("role IN ('depo','delivery')");

  if (!needsUsers && !needsScan) return;

  const tx = db.transaction(() => {
    db.pragma("foreign_keys = OFF");

    if (needsUsers) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users_new (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin','buyer','farmer','depo','delivery')),
          area TEXT NULL,
          displayName TEXT NULL,
          buyerName TEXT NULL,
          farmerName TEXT NULL,
          createdAtMs INTEGER NOT NULL
        );
      `);
      db.exec(`
        INSERT INTO users_new (id, username, password, role, area, displayName, buyerName, farmerName, createdAtMs)
        SELECT id, username, password, role, area, NULL, NULL, NULL, createdAtMs FROM users;
      `);
      db.exec(`DROP TABLE users;`);
      db.exec(`ALTER TABLE users_new RENAME TO users;`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
    }

    if (needsScan) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS scan_events_new (
          id TEXT PRIMARY KEY,
          orderId TEXT NOT NULL,
          shipmentId TEXT NULL,
          scannedByUserId TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin','depo','delivery')),
          area TEXT NULL,
          timestampMs INTEGER NOT NULL,
          action TEXT NOT NULL,
          FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY(shipmentId) REFERENCES shipments(id) ON DELETE SET NULL,
          FOREIGN KEY(scannedByUserId) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      db.exec(`
        INSERT INTO scan_events_new (id, orderId, shipmentId, scannedByUserId, role, area, timestampMs, action)
        SELECT id, orderId, shipmentId, scannedByUserId, role, area, timestampMs, action FROM scan_events;
      `);
      db.exec(`DROP TABLE scan_events;`);
      db.exec(`ALTER TABLE scan_events_new RENAME TO scan_events;`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_scan_events_orderId ON scan_events(orderId);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_scan_events_time ON scan_events(timestampMs);`);
    }

    db.pragma("foreign_keys = ON");
  });

  tx();
}

function migrateUsersProfileColumns(db: Database.Database) {
  const usersSql = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`)
    .get() as { sql?: string } | undefined;
  if (!usersSql?.sql) return;

  const sql = usersSql.sql;
  const roleAllowsBuyerFarmer = sql.includes("'buyer'") && sql.includes("'farmer'");
  const info = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
  const cols = new Set(info.map((c) => c.name));
  const hasProfileCols = cols.has("displayName") && cols.has("buyerName") && cols.has("farmerName");

  if (roleAllowsBuyerFarmer && hasProfileCols) return;

  const tx = db.transaction(() => {
    db.pragma("foreign_keys = OFF");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users_mig (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','buyer','farmer','depo','delivery')),
        area TEXT NULL,
        displayName TEXT NULL,
        buyerName TEXT NULL,
        farmerName TEXT NULL,
        createdAtMs INTEGER NOT NULL
      );
    `);

    if (cols.has("displayName") && cols.has("buyerName") && cols.has("farmerName")) {
      db.exec(`
        INSERT INTO users_mig (id, username, password, role, area, displayName, buyerName, farmerName, createdAtMs)
        SELECT id, username, password, role, area, displayName, buyerName, farmerName, createdAtMs FROM users;
      `);
    } else {
      db.exec(`
        INSERT INTO users_mig (id, username, password, role, area, displayName, buyerName, farmerName, createdAtMs)
        SELECT id, username, password, role, area, NULL, NULL, NULL, createdAtMs FROM users;
      `);
    }

    db.exec(`DROP TABLE users;`);
    db.exec(`ALTER TABLE users_mig RENAME TO users;`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
    db.pragma("foreign_keys = ON");
  });

  tx();
}

function seedCrops(db: Database.Database) {
  const now = Date.now();
  const insert = db.prepare(`
    INSERT INTO crops
      (name, farmer, location, price, unit, rating, harvest, category, image, active, createdAtMs)
    VALUES
      (@name, @farmer, @location, @price, @unit, @rating, @harvest, @category, @image, @active, @createdAtMs)
  `);

  const rows = [
    { name: "অর্গানিক টমেটো", farmer: "আব্দুল করিম", location: "ঢাকা", price: 120, unit: "kg", rating: 4.8, harvest: "এপ্রি ২০২৬", category: "Vegetables", image: "seed:tomato", active: 1 },
    { name: "তাজা ভুট্টা", farmer: "মোছা. রুনা আক্তার", location: "চট্টগ্রাম", price: 80, unit: "kg", rating: 4.5, harvest: "মে ২০২৬", category: "Grains", image: "seed:corn", active: 1 },
    { name: "অ্যাভোকাডো", farmer: "মো. রাশেদুল ইসলাম", location: "খুলনা", price: 200, unit: "kg", rating: 4.9, harvest: "মার্চ ২০২৬", category: "Fruits", image: "seed:avocado", active: 1 },
    { name: "শিম", farmer: "সালমা খাতুন", location: "সিলেট", price: 150, unit: "kg", rating: 4.6, harvest: "এপ্রি ২০২৬", category: "Vegetables", image: "seed:peas", active: 1 },
    { name: "তাজা আম", farmer: "মো. হাবিবুর রহমান", location: "ঢাকা", price: 100, unit: "kg", rating: 4.7, harvest: "ফেব ২০২৬", category: "Fruits", image: "seed:mango", active: 1 },
    { name: "চাল", farmer: "শাহিনুর রহমান", location: "চট্টগ্রাম", price: 180, unit: "kg", rating: 4.4, harvest: "জুন ২০২৬", category: "Grains", image: "seed:rice", active: 1 },
    { name: "আলু", farmer: "নাসির উদ্দিন", location: "খুলনা", price: 60, unit: "kg", rating: 4.3, harvest: "এপ্রি ২০২৬", category: "Vegetables", image: "seed:potatoes", active: 1 },
    { name: "কলা", farmer: "ফারজানা ইয়াসমিন", location: "সিলেট", price: 70, unit: "bunch", rating: 4.5, harvest: "মার্চ ২০২৬", category: "Fruits", image: "seed:bananas", active: 1 },
  ] as const;

  const tx = db.transaction(() => {
    for (const r of rows) insert.run({ ...r, createdAtMs: now });
  });
  tx();
}

function seedWarehouses(db: Database.Database) {
  const now = Date.now();
  const insert = db.prepare(`
    INSERT INTO warehouses
      (id, name, kind, area, temp, maxItems, items, createdAtMs)
    VALUES
      (@id, @name, @kind, @area, @temp, @maxItems, @items, @createdAtMs)
  `);

  const rows: Array<Omit<WarehouseRow, "createdAtMs">> = [
    { id: "CWH-NAI", name: "ঢাকা সিটি হাব", kind: "city", area: "ঢাকা", maxItems: 5000, items: 1240, temp: "4°C" },
    { id: "CWH-CTG", name: "চট্টগ্রাম ডিপো", kind: "city", area: "চট্টগ্রাম", maxItems: 5000, items: 830, temp: "6°C" },
    { id: "CWH-KHL", name: "খুলনা স্টোরেজ", kind: "city", area: "খুলনা", maxItems: 5000, items: 1580, temp: "3°C" },
    { id: "CWH-SYL", name: "সিলেট ডিপো", kind: "city", area: "সিলেট", maxItems: 5000, items: 640, temp: "5°C" },
  ];

  const tx = db.transaction(() => {
    for (const r of rows) insert.run({ ...r, createdAtMs: now });
  });
  tx();
}

function ensureCityWarehouses(db: Database.Database) {
  const now = Date.now();
  const upsert = db.prepare(`
    INSERT INTO warehouses (id, name, kind, area, temp, maxItems, items, createdAtMs)
    VALUES (@id, @name, @kind, @area, @temp, @maxItems, @items, @createdAtMs)
    ON CONFLICT(id) DO NOTHING
  `);

  const required: Array<Omit<WarehouseRow, "createdAtMs">> = [
    { id: "CWH-NAI", name: "ঢাকা সিটি হাব", kind: "city", area: "ঢাকা", maxItems: 5000, items: 1240, temp: "4°C" },
    { id: "CWH-CTG", name: "চট্টগ্রাম ডিপো", kind: "city", area: "চট্টগ্রাম", maxItems: 5000, items: 830, temp: "6°C" },
    { id: "CWH-KHL", name: "খুলনা স্টোরেজ", kind: "city", area: "খুলনা", maxItems: 5000, items: 1580, temp: "3°C" },
    { id: "CWH-SYL", name: "সিলেট ডিপো", kind: "city", area: "সিলেট", maxItems: 5000, items: 640, temp: "5°C" },
  ];

  const tx = db.transaction(() => {
    for (const r of required) upsert.run({ ...r, createdAtMs: now });
  });
  tx();
}

function normalizeCropLocations(db: Database.Database) {
  // Keep demo consistent: crops must point to known depot areas.
  const allowed = new Set(["ঢাকা", "চট্টগ্রাম", "খুলনা", "সিলেট"]);
  const rows = db.prepare(`SELECT id, location FROM crops`).all() as Array<{ id: number; location: string }>;
  const update = db.prepare(`UPDATE crops SET location = ? WHERE id = ?`);

  const tx = db.transaction(() => {
    for (const r of rows) {
      const loc = (r.location || "").trim();
      if (!allowed.has(loc)) update.run("ঢাকা", r.id);
    }
  });
  tx();
}

function seedUsers(db: Database.Database) {
  const count = db.prepare(`SELECT COUNT(1) as n FROM users`).get() as { n: number };
  if ((count?.n ?? 0) > 0) return;

  const now = Date.now();
  const insert = db.prepare(
    `INSERT INTO users (id, username, password, role, area, displayName, buyerName, farmerName, createdAtMs)
     VALUES (@id, @username, @password, @role, @area, @displayName, @buyerName, @farmerName, @createdAtMs)`,
  );

  const rows: Array<Omit<UserRow, "createdAtMs">> = [
    {
      id: "USR-ADM",
      username: "admin",
      password: "1234",
      role: "admin",
      area: null,
      displayName: "সিস্টেম অ্যাডমিন",
      buyerName: null,
      farmerName: null,
    },
    {
      id: "USR-BUY",
      username: "buyer",
      password: "1234",
      role: "buyer",
      area: null,
      displayName: "ঢাকা ফ্রেশ ক্রেতা",
      buyerName: "ঢাকা ফ্রেশ মার্কেট",
      farmerName: null,
    },
    {
      id: "USR-FRM",
      username: "farmer",
      password: "1234",
      role: "farmer",
      area: null,
      displayName: "আব্দুল করিম",
      buyerName: null,
      farmerName: "আব্দুল করিম",
    },
    {
      id: "USR-DHK",
      username: "dhaka",
      password: "1234",
      role: "depo",
      area: "ঢাকা",
      displayName: "ঢাকা ডিপো",
      buyerName: null,
      farmerName: null,
    },
    {
      id: "USR-CTG",
      username: "ctg",
      password: "1234",
      role: "depo",
      area: "চট্টগ্রাম",
      displayName: "চট্টগ্রাম ডিপো",
      buyerName: null,
      farmerName: null,
    },
    {
      id: "USR-KHL",
      username: "khulna",
      password: "1234",
      role: "depo",
      area: "খুলনা",
      displayName: "খুলনা ডিপো",
      buyerName: null,
      farmerName: null,
    },
    {
      id: "USR-SYL",
      username: "sylhet",
      password: "1234",
      role: "depo",
      area: "সিলেট",
      displayName: "সিলেট ডিপো",
      buyerName: null,
      farmerName: null,
    },
    {
      id: "USR-DLV",
      username: "delivery",
      password: "1234",
      role: "delivery",
      area: null,
      displayName: "ডেলিভারি",
      buyerName: null,
      farmerName: null,
    },
  ];

  const tx = db.transaction(() => {
    for (const r of rows) insert.run({ ...r, createdAtMs: now });
  });
  tx();
}

function ensureBuyerFarmerDemoUsers(db: Database.Database) {
  const now = Date.now();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO users (id, username, password, role, area, displayName, buyerName, farmerName, createdAtMs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insert.run("USR-BUY", "buyer", "1234", "buyer", null, "ঢাকা ফ্রেশ ক্রেতা", "ঢাকা ফ্রেশ মার্কেট", null, now);
  insert.run("USR-FRM", "farmer", "1234", "farmer", null, "আব্দুল করিম", null, "আব্দুল করিম", now);
  db.prepare(
    `UPDATE users SET displayName = ?, buyerName = ?, farmerName = ? WHERE username = 'buyer' AND (buyerName IS NULL OR TRIM(buyerName) = '')`,
  ).run("ঢাকা ফ্রেশ ক্রেতা", "ঢাকা ফ্রেশ মার্কেট", null);
  db.prepare(
    `UPDATE users SET displayName = ?, buyerName = ?, farmerName = ? WHERE username = 'farmer' AND (farmerName IS NULL OR TRIM(farmerName) = '')`,
  ).run("আব্দুল করিম", null, "আব্দুল করিম");
}

export function ensureAdminUser(db: Database.Database) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, username, password, role, area, displayName, buyerName, farmerName, createdAtMs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(username) DO NOTHING`,
  ).run("USR-ADM", "admin", "1234", "admin", null, "সিস্টেম অ্যাডমিন", null, null, now);
}

