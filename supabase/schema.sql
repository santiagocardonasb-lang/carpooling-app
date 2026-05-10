-- ============================================================
--  Carpool App — PostgreSQL Schema (Supabase)
--  Ejecuta este script en el SQL Editor de Supabase una sola vez.
-- ============================================================

-- ── Usuarios ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  phone        TEXT,
  avatar       TEXT,
  role         TEXT DEFAULT 'passenger',
  car_brand    TEXT,
  car_color    TEXT,
  car_plate    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Viajes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
  id              SERIAL PRIMARY KEY,
  driver_id       INTEGER NOT NULL REFERENCES users(id),
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  date            TEXT,                   -- NULL para recurrentes
  time            TEXT NOT NULL,
  seats           INTEGER NOT NULL,
  seats_available INTEGER NOT NULL,
  price           NUMERIC NOT NULL,
  description     TEXT,
  vehicle_type    TEXT DEFAULT 'car',
  is_recurring    INTEGER DEFAULT 0,      -- 0=único, 1=recurrente
  days_of_week    TEXT,                   -- ej: "1,3,5" (lun/mié/vie)
  status          TEXT DEFAULT 'active',  -- active | cancelled | expired
  reminder_sent   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reservas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                      SERIAL PRIMARY KEY,
  ride_id                 INTEGER NOT NULL REFERENCES rides(id),
  passenger_id            INTEGER NOT NULL REFERENCES users(id),
  seats                   INTEGER NOT NULL DEFAULT 1,
  proposed_time           TEXT,
  booking_date            TEXT,
  booking_days            TEXT,
  status                  TEXT DEFAULT 'pending',
  -- pending | confirmed | in_progress | completed | cancelled | rejected | expired
  completed_at            TIMESTAMPTZ,
  cancelled_dates         TEXT,           -- JSON array de fechas canceladas
  started_at              TIMESTAMPTZ,
  passenger_ready         INTEGER DEFAULT 0,
  passenger_last_read_at  TIMESTAMPTZ,
  driver_last_read_at     TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Mensajes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id),
  sender_id   INTEGER NOT NULL REFERENCES users(id),
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notificaciones ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  read        INTEGER DEFAULT 0,
  related_id  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Calificaciones ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id),
  rater_id    INTEGER NOT NULL REFERENCES users(id),
  ratee_id    INTEGER NOT NULL REFERENCES users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  type        TEXT NOT NULL,   -- passenger_to_driver | driver_to_passenger
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, rater_id)
);

-- ── Índices de rendimiento ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_status_seats     ON rides(status, seats_available);
CREATE INDEX IF NOT EXISTS idx_rides_driver           ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_date             ON rides(date);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger     ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ride          ON bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status        ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_notif_user_read        ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notif_user_created     ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email            ON users(email);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee          ON ratings(ratee_id);
CREATE INDEX IF NOT EXISTS idx_ratings_booking        ON ratings(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking       ON messages(booking_id, created_at);
