-- Hoy una reserva cancelada queda en status='cancelled' sin decir quién la
-- canceló: el conductor que dejó a alguien plantado y el pasajero que avisó
-- con dos días se ven exactamente igual. Esta columna los separa, que es lo
-- que permite mostrar la confiabilidad de un conductor.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,       -- 'driver' | 'passenger' | 'system'
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  -- Horas de antelación con las que se canceló. Un valor bajo es lo que
  -- convierte una cancelación normal en una cancelación tardía.
  ADD COLUMN IF NOT EXISTS cancel_notice_hours DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by
  ON bookings (cancelled_by)
  WHERE cancelled_by IS NOT NULL;
