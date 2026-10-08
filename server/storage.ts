import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// A transactional SQLite adapter for the existing domain store. JSON payloads
// preserve the current frontend contract; keys, ownership, prices, and statuses
// have SQL columns/constraints so they can be queried and migrated independently.
const definitions = {
  users: 'email TEXT NOT NULL UNIQUE COLLATE NOCASE, role TEXT NOT NULL, status TEXT NOT NULL',
  categories: 'slug TEXT NOT NULL UNIQUE',
  providers: 'user_id TEXT NOT NULL UNIQUE REFERENCES users(id), status TEXT NOT NULL',
  homemakers: 'user_id TEXT NOT NULL UNIQUE REFERENCES users(id), status TEXT NOT NULL',
  farmers: 'user_id TEXT NOT NULL UNIQUE REFERENCES users(id), status TEXT NOT NULL',
  institutions: 'user_id TEXT NOT NULL UNIQUE REFERENCES users(id), status TEXT NOT NULL',
  menu: 'homemaker_id TEXT NOT NULL REFERENCES homemakers(id), price REAL NOT NULL CHECK(price > 0)',
  packages: 'homemaker_id TEXT NOT NULL REFERENCES homemakers(id), price REAL NOT NULL CHECK(price > 0)',
  produceListings: 'farmer_id TEXT NOT NULL REFERENCES farmers(id), price REAL NOT NULL CHECK(price > 0), quantity REAL NOT NULL CHECK(quantity >= 0)',
  bookings: 'student_id TEXT NOT NULL REFERENCES users(id), provider_id TEXT NOT NULL REFERENCES providers(id), status TEXT NOT NULL, amount REAL NOT NULL CHECK(amount >= 0), request_key TEXT, UNIQUE(student_id, request_key)',
  foodOrders: 'student_id TEXT NOT NULL REFERENCES users(id), homemaker_id TEXT NOT NULL REFERENCES homemakers(id), status TEXT NOT NULL, amount REAL NOT NULL CHECK(amount >= 0), request_key TEXT, UNIQUE(student_id, request_key)',
  foodItems: 'order_id TEXT NOT NULL REFERENCES foodOrders(id), quantity INTEGER NOT NULL CHECK(quantity > 0), price REAL NOT NULL CHECK(price > 0)',
  recurringServices: 'student_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL',
  payments: 'user_id TEXT NOT NULL REFERENCES users(id), reference_id TEXT NOT NULL, status TEXT NOT NULL, amount REAL NOT NULL CHECK(amount >= 0)',
  reviews: 'student_id TEXT NOT NULL REFERENCES users(id), booking_id TEXT REFERENCES bookings(id), order_id TEXT REFERENCES foodOrders(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5)',
  notifications: 'user_id TEXT NOT NULL REFERENCES users(id)',
  complaints: 'reporter_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL',
  institutionAnnouncements: 'institution_id TEXT NOT NULL REFERENCES institutions(id)',
  addresses: 'user_id TEXT NOT NULL REFERENCES users(id)',
  favorites: 'user_id TEXT NOT NULL REFERENCES users(id), provider_id TEXT NOT NULL, UNIQUE(user_id, provider_id)',
  verifications: 'user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL',
  sessions: 'user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL',
} as const;

type Table = keyof typeof definitions;
const columns: Record<Table, string[]> = {
  users: ['email', 'role', 'status'], categories: ['slug'],
  providers: ['user_id', 'status'], homemakers: ['user_id', 'status'], farmers: ['user_id', 'status'], institutions: ['user_id', 'status'],
  menu: ['homemaker_id', 'price'], packages: ['homemaker_id', 'price'],
  produceListings: ['farmer_id', 'price', 'quantity'],
  bookings: ['student_id', 'provider_id', 'status', 'amount', 'request_key'],
  foodOrders: ['student_id', 'homemaker_id', 'status', 'amount', 'request_key'], foodItems: ['order_id', 'quantity', 'price'],
  recurringServices: ['student_id', 'status'], payments: ['user_id', 'reference_id', 'status', 'amount'],
  reviews: ['student_id', 'booking_id', 'order_id', 'rating'], notifications: ['user_id'], complaints: ['reporter_id', 'status'],
  institutionAnnouncements: ['institution_id'], addresses: ['user_id'], favorites: ['user_id', 'provider_id'],
  verifications: ['user_id', 'status'], sessions: ['user_id', 'expires_at']
};

function values(table: Table, record: any): (string | number | null)[] {
  switch (table) {
    case 'users': return [record.email, record.role, record.status];
    case 'categories': return [record.slug];
    case 'providers': case 'homemakers': case 'farmers': return [record.userId, record.verifiedStatus];
    case 'institutions': return [record.userId, record.verificationStatus];
    case 'menu': return [record.homemakerId, record.price];
    case 'packages': return [record.homemakerId, record.totalPrice];
    case 'produceListings': return [record.farmerId, record.price, record.quantityAvailable];
    case 'bookings': return [record.studentId, record.providerId, record.status, record.price, record.idempotencyKey || null];
    case 'foodOrders': return [record.studentId, record.homemakerId, record.status, record.grandTotal, record.idempotencyKey || null];
    case 'foodItems': return [record.orderId, record.quantity, record.unitPrice];
    case 'recurringServices': return [record.studentId, record.status];
    case 'payments': return [record.userId, record.referenceId, record.status, record.amount];
    case 'reviews': return [record.studentId, record.bookingId || null, record.orderId || null, record.rating];
    case 'notifications': return [record.userId];
    case 'complaints': return [record.reporterId, record.status];
    case 'institutionAnnouncements': return [record.institutionId];
    case 'addresses': return [record.userId];
    case 'favorites': return [record.userId, record.providerId];
    case 'verifications': return [record.userId, record.status];
    case 'sessions': return [record.userId, record.expiresAt];
  }
}

export class SqliteStorage {
  private connection: DatabaseSync;
  private cache = new Map<Table, Map<string, string>>();

  constructor() {
    const url = process.env.DATABASE_URL || 'file:./data/pgsaathi.db';
    if (!url.startsWith('file:')) throw new Error('DATABASE_URL must be a file: SQLite URL for this deployment.');
    const filename = path.resolve(url.slice(5));
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.connection = new DatabaseSync(filename);
    this.connection.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    for (const [table, definition] of Object.entries(definitions)) {
      try {
        this.connection.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)), ${definition});`);
      } catch (error) {
        throw new Error(`Could not create SQLite table ${table}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.connection.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS bookings_student_status ON bookings(student_id, status);
      CREATE INDEX IF NOT EXISTS bookings_provider_status ON bookings(provider_id, status);
      CREATE INDEX IF NOT EXISTS orders_student_status ON foodOrders(student_id, status);
      CREATE INDEX IF NOT EXISTS orders_kitchen_status ON foodOrders(homemaker_id, status);
      CREATE INDEX IF NOT EXISTS notifications_owner ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS produce_farmer ON produceListings(farmer_id);
      CREATE UNIQUE INDEX IF NOT EXISTS review_booking ON reviews(booking_id) WHERE booking_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS review_order ON reviews(order_id) WHERE order_id IS NOT NULL;
      PRAGMA user_version = 1;
    `);
  }

  initialized(): boolean {
    return Boolean(this.connection.prepare("SELECT value FROM settings WHERE key = 'initialized'").get());
  }

  load(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const table of Object.keys(definitions) as Table[]) {
      const rows = this.connection.prepare(`SELECT id, payload FROM ${table} ORDER BY rowid`).all() as { id: string; payload: string }[];
      this.cache.set(table, new Map(rows.map(row => [row.id, row.payload])));
      result[table] = rows.map(row => JSON.parse(row.payload));
    }
    for (const kitchen of result.homemakers) {
      kitchen.menu = result.menu.filter((item: any) => item.homemakerId === kitchen.id);
      kitchen.packages = result.packages.filter((item: any) => item.homemakerId === kitchen.id);
    }
    for (const order of result.foodOrders) {
      order.items = result.foodItems.filter((item: any) => item.orderId === order.id).map(({ id, orderId, ...item }: any) => item);
    }
    const weights = this.connection.prepare("SELECT value FROM settings WHERE key = 'matchingWeights'").get() as { value: string } | undefined;
    if (weights) result.matchingWeights = JSON.parse(weights.value);
    return result;
  }

  save(data: Record<string, any>): void {
    const records = { ...data };
    records.menu = data.homemakers.flatMap((kitchen: any) => kitchen.menu);
    records.packages = data.homemakers.flatMap((kitchen: any) => kitchen.packages);
    records.homemakers = data.homemakers.map(({ menu, packages, ...kitchen }: any) => kitchen);
    records.foodItems = data.foodOrders.flatMap((order: any) => order.items.map((item: any, index: number) => ({ ...item, id: `${order.id}-${index}`, orderId: order.id })));
    records.foodOrders = data.foodOrders.map(({ items, ...order }: any) => order);
    const nextCache = new Map<Table, Map<string, string>>();
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      // Child removals first, parent upserts first. This preserves FK integrity.
      for (const table of (Object.keys(definitions) as Table[]).reverse()) {
        const ids = new Set((records[table] || []).map((record: any) => record.id));
        const remove = this.connection.prepare(`DELETE FROM ${table} WHERE id = ?`);
        for (const id of this.cache.get(table)?.keys() || []) if (!ids.has(id)) remove.run(id);
      }
      for (const table of Object.keys(definitions) as Table[]) {
        const fields = ['id', ...columns[table], 'payload'];
        const statement = this.connection.prepare(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${fields.slice(1).map(field => `${field}=excluded.${field}`).join(',')}`);
        const tableCache = new Map<string, string>();
        for (const record of records[table] || []) {
          const payload = JSON.stringify(record);
          tableCache.set(record.id, payload);
          if (this.cache.get(table)?.get(record.id) !== payload) statement.run(record.id, ...values(table, record), payload);
        }
        nextCache.set(table, tableCache);
      }
      const setting = this.connection.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      setting.run('matchingWeights', JSON.stringify(data.matchingWeights));
      setting.run('initialized', 'true');
      this.connection.exec('COMMIT');
      this.cache = nextCache;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }
}
