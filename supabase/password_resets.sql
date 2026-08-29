-- Recuperación de contraseña por código de 4 dígitos enviado al correo.
-- Ejecutar una sola vez en Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- El código nunca se guarda en claro, igual que las contraseñas.
  code_hash   TEXT        NOT NULL,
  -- Token de un solo uso que se entrega cuando el código se verifica bien.
  token       TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buscar el código vigente de un usuario, y contar cuántos pidió en la última hora.
CREATE INDEX IF NOT EXISTS idx_password_resets_user
  ON password_resets (user_id, created_at DESC);

-- Canjear el token de restablecimiento.
CREATE INDEX IF NOT EXISTS idx_password_resets_token
  ON password_resets (token)
  WHERE token IS NOT NULL;
