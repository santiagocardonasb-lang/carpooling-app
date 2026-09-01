-- Verificación del correo institucional.
--
-- Hoy cualquiera puede registrarse con una dirección @ucundinamarca.edu.co
-- inventada sin demostrar que es suya. Esto reutiliza la misma mecánica de
-- códigos de la recuperación de contraseña, distinguiendo para qué sirve
-- cada código con la columna purpose.
--
-- Ejecutar una sola vez en Supabase → SQL Editor. Es seguro correrlo aunque
-- ya se haya ejecutado password_resets.sql.

-- 1) La tabla de códigos, por si aún no existe.
CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT        NOT NULL,
  token       TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user
  ON password_resets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_resets_token
  ON password_resets (token) WHERE token IS NOT NULL;

-- 2) Para qué sirve cada código. Los que ya existan son de recuperación.
ALTER TABLE password_resets
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'reset';

CREATE INDEX IF NOT EXISTS idx_password_resets_purpose
  ON password_resets (user_id, purpose, created_at DESC);

-- 3) Marca en el usuario.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 4) Las cuentas que ya existían se dan por verificadas: pedirles el paso
--    ahora sería castigarlas por haberse registrado antes de que existiera.
UPDATE users SET email_verified = TRUE WHERE created_at < NOW();
