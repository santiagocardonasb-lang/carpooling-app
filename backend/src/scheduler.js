const { query, withTransaction } = require('./db');

// 1) Auto-completar viajes en curso por más de 6 horas
async function autoCompleteStaleTrips() {
  const stale = await query(`
    SELECT b.id, b.passenger_id, b.seats, b.ride_id, r.origin, r.destination
    FROM bookings b JOIN rides r ON b.ride_id = r.id
    WHERE b.status = 'in_progress' AND b.started_at < NOW() - INTERVAL '6 hours'
  `);

  for (const b of stale.rows) {
    try {
      await withTransaction(async (client) => {
        await client.query("UPDATE bookings SET status='completed', completed_at=NOW() WHERE id=$1", [b.id]);
        await client.query('UPDATE rides SET seats_available=seats_available+$1 WHERE id=$2', [b.seats, b.ride_id]);
      });
      await query(
        'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
        [b.passenger_id, 'booking_completed', 'Viaje completado',
         `Tu viaje ${b.origin} → ${b.destination} fue completado automáticamente. ¡Califica al conductor!`, b.id]
      );
    } catch (e) {
      console.error(`[scheduler] autoComplete booking ${b.id}:`, e.message);
    }
  }
  if (stale.rows.length) console.log(`[scheduler] auto-completados ${stale.rows.length} viajes en curso >6h`);
}

// 2) Recordatorio 15 min antes de la hora prevista (solo viajes one-time)
//    Comparación timezone-aware en SQL para evitar offsets entre UTC y Bogotá.
async function sendDepartureReminders() {
  const ridesRes = await query(`
    SELECT * FROM rides
    WHERE status='active' AND is_recurring=0 AND reminder_sent=0
      AND ((date::text || ' ' || time)::timestamp AT TIME ZONE 'America/Bogota')
          BETWEEN NOW() + INTERVAL '13 minutes' AND NOW() + INTERVAL '17 minutes'
  `);

  for (const ride of ridesRes.rows) {
    if (!ride.time) continue;

    const pbRes = await query(
      "SELECT id, passenger_id FROM bookings WHERE ride_id=$1 AND status='confirmed'",
      [ride.id]
    );
    const msg = `${ride.origin} → ${ride.destination} a las ${ride.time}`;
    for (const pb of pbRes.rows) {
      await query(
        'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
        [pb.passenger_id, 'departure_reminder', 'Tu viaje sale en 15 minutos', `Recuerda: ${msg}`, pb.id]
      );
    }
    await query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
      [ride.driver_id, 'departure_reminder', 'Sale en 15 minutos', `Tu viaje: ${msg}`, ride.id]
    );
    await query('UPDATE rides SET reminder_sent=1 WHERE id=$1', [ride.id]);
    console.log(`[scheduler] recordatorio ride ${ride.id} (${pbRes.rows.length + 1} usuarios)`);
  }
}

// 3) Expirar viajes one-time cuya fecha+hora pasó hace más de 1 hora
//    Usamos comparación timezone-aware: las fechas/horas se guardan en hora
//    local de Colombia (America/Bogota, UTC-5) pero NOW() es UTC en Render.
async function expirePastRides() {
  const expiredRes = await query(`
    SELECT id, origin, destination, driver_id
    FROM rides
    WHERE status='active' AND is_recurring=0
      AND ((date::text || ' ' || time)::timestamp AT TIME ZONE 'America/Bogota')
          < NOW() - INTERVAL '1 hour'
  `);

  for (const ride of expiredRes.rows) {
    const activeRes = await query(
      "SELECT id, passenger_id FROM bookings WHERE ride_id=$1 AND status IN ('pending','confirmed')",
      [ride.id]
    );
    try {
      await withTransaction(async (client) => {
        await client.query("UPDATE rides SET status='expired' WHERE id=$1", [ride.id]);
        await client.query(
          "UPDATE bookings SET status='expired' WHERE ride_id=$1 AND status IN ('pending','confirmed')",
          [ride.id]
        );
      });
    } catch (e) {
      console.error(`[scheduler] expirePastRides ride ${ride.id}:`, e.message);
      continue;
    }
    for (const b of activeRes.rows) {
      await query(
        'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES ($1,$2,$3,$4,$5)',
        [b.passenger_id, 'ride_cancelled', 'Viaje expirado',
         `El viaje ${ride.origin} → ${ride.destination} expiró sin iniciarse. Tu reserva fue cancelada.`, b.id]
      );
    }
  }
  if (expiredRes.rows.length) console.log(`[scheduler] expirados ${expiredRes.rows.length} viajes one-time pasados`);
}

// 4) Auto-borrado de notificaciones con más de 7 días
async function purgeOldNotifications() {
  const result = await query("DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '7 days'");
  if (result.rowCount) console.log(`[scheduler] borradas ${result.rowCount} notificaciones >7d`);
}

// 5) Eliminar rides 'expired' de más de 7 días
async function purgeOldExpiredRides() {
  const result = await query("DELETE FROM rides WHERE status='expired' AND created_at < NOW() - INTERVAL '7 days'");
  if (result.rowCount) console.log(`[scheduler] eliminados ${result.rowCount} rides expirados >7d`);
}

function start() {
  const run = () => {
    autoCompleteStaleTrips().catch(e => console.error('[scheduler] autoComplete:', e.message));
    sendDepartureReminders().catch(e => console.error('[scheduler] reminders:', e.message));
    expirePastRides().catch(e => console.error('[scheduler] expirePastRides:', e.message));
    purgeOldNotifications().catch(e => console.error('[scheduler] purgeNotifs:', e.message));
    purgeOldExpiredRides().catch(e => console.error('[scheduler] purgeRides:', e.message));
  };

  run(); // Ejecutar al inicio para no esperar el primer minuto
  setInterval(run, 60_000);
  console.log('[scheduler] iniciado: auto-complete 6h, recordatorios 15min, expirar 1h, purgar 7d');
}

module.exports = { start };
