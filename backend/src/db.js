const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../carpooling.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    date TEXT,
    time TEXT NOT NULL,
    seats INTEGER NOT NULL,
    seats_available INTEGER NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    vehicle_type TEXT DEFAULT 'car',
    is_recurring INTEGER DEFAULT 0,
    days_of_week TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id INTEGER NOT NULL,
    passenger_id INTEGER NOT NULL,
    seats INTEGER NOT NULL DEFAULT 1,
    proposed_time TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id),
    FOREIGN KEY (passenger_id) REFERENCES users(id)
  );
`);

const migrations = [
  `ALTER TABLE users ADD COLUMN avatar TEXT`,
  `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'passenger'`,
  `ALTER TABLE rides ADD COLUMN vehicle_type TEXT DEFAULT 'car'`,
  `ALTER TABLE rides ADD COLUMN is_recurring INTEGER DEFAULT 0`,
  `ALTER TABLE rides ADD COLUMN days_of_week TEXT`,
  `ALTER TABLE bookings ADD COLUMN proposed_time TEXT`,
  `ALTER TABLE bookings ADD COLUMN booking_date TEXT`,
  `ALTER TABLE bookings ADD COLUMN booking_days TEXT`,
  `ALTER TABLE users ADD COLUMN car_brand TEXT`,
  `ALTER TABLE users ADD COLUMN car_color TEXT`,
  `ALTER TABLE users ADD COLUMN car_plate TEXT`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* already exists */ }
}

// Fix: rides.date must allow NULL for recurring rides.
// Recreate table only if date column still has NOT NULL constraint.
try {
  const cols = db.prepare("PRAGMA table_info(rides)").all();
  const dateCol = cols.find(c => c.name === 'date');
  if (dateCol && dateCol.notnull === 1) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE IF NOT EXISTS rides_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        date TEXT,
        time TEXT NOT NULL,
        seats INTEGER NOT NULL,
        seats_available INTEGER NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        vehicle_type TEXT DEFAULT 'car',
        is_recurring INTEGER DEFAULT 0,
        days_of_week TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id)
      );
      INSERT INTO rides_new SELECT * FROM rides;
      DROP TABLE rides;
      ALTER TABLE rides_new RENAME TO rides;
      PRAGMA foreign_keys = ON;
    `);
    console.log('Migración completada: rides.date ahora permite NULL');
  }
} catch (e) {
  console.error('Error en migración de rides.date:', e.message);
}

module.exports = db;
