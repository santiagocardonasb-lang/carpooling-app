const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../carpooling.db'));

// Performance + integridad
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
`);

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

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    rater_id INTEGER NOT NULL,
    ratee_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, rater_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (rater_id) REFERENCES users(id),
    FOREIGN KEY (ratee_id) REFERENCES users(id)
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
  `ALTER TABLE bookings ADD COLUMN completed_at DATETIME`,
  `ALTER TABLE bookings ADD COLUMN cancelled_dates TEXT`,
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

// Índices para acelerar las consultas más frecuentes
const indexes = [
  `CREATE INDEX IF NOT EXISTS idx_rides_status_seats ON rides(status, seats_available)`,
  `CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rides_date ON rides(date)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_ride ON bookings(ride_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, read)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_user_created ON notifications(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON ratings(ratee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ratings_booking ON ratings(booking_id)`,
];
for (const sql of indexes) {
  try { db.exec(sql); } catch (e) { console.error('Index error:', e.message); }
}

module.exports = db;
