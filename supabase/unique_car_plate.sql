-- Una placa solo puede pertenecer a un conductor.
-- El backend ya lo valida, pero el índice lo garantiza aunque dos conductores
-- guarden al mismo tiempo. Ejecutar una sola vez en Supabase → SQL Editor.

-- 1) Antes de crear el índice, revisar si ya hay placas repetidas.
--    Si esta consulta devuelve filas, resuélvelas primero: el paso 2 falla
--    mientras existan duplicados.
SELECT car_plate, COUNT(*) AS conductores, ARRAY_AGG(name) AS nombres
FROM users
WHERE car_plate IS NOT NULL AND car_plate <> ''
GROUP BY car_plate
HAVING COUNT(*) > 1;

-- 2) Crear el índice único. Ignora los NULL y las cadenas vacías, así que los
--    pasajeros y los conductores que aún no cargaron placa no se ven afectados.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_car_plate_unique
  ON users (car_plate)
  WHERE car_plate IS NOT NULL AND car_plate <> '';
