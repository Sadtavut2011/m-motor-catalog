import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'm-motor.db');

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS motorcycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    price REAL NOT NULL,
    cash_price REAL,
    finance_amount REAL,
    cc_size INTEGER,
    description TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS installment_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorcycle_id INTEGER NOT NULL,
    months INTEGER NOT NULL,
    monthly_payment REAL NOT NULL,
    down_payment REAL NOT NULL,
    interest_rate REAL NOT NULL,
    FOREIGN KEY (motorcycle_id) REFERENCES motorcycles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pricing_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorcycle_id INTEGER NOT NULL,
    table_data TEXT NOT NULL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (motorcycle_id) REFERENCES motorcycles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS down_payment_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS installment_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    months INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS motorcycle_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorcycle_id INTEGER NOT NULL,
    color_name TEXT NOT NULL,
    color_code TEXT,
    image_url TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (motorcycle_id) REFERENCES motorcycles(id) ON DELETE CASCADE
  );
`);

export default db;
