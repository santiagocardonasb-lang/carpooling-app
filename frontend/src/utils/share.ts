interface ShareTrip {
  origin: string;
  destination: string;
  date?: string;
  time: string;
  driver_name?: string;
  driver_phone?: string;
  car_brand?: string;
  car_color?: string;
  car_plate?: string;
}

export function buildTripMessage(t: ShareTrip): string {
  const lines: string[] = ['🚗 *Estoy en este carpool*', '', `📍 ${t.origin} → ${t.destination}`];
  if (t.date) lines.push(`📅 ${t.date}`);
  lines.push(`🕐 ${t.time}`);
  if (t.driver_name) lines.push('', `👤 Conductor: ${t.driver_name}`);
  if (t.driver_phone) lines.push(`📱 Tel: ${t.driver_phone}`);
  const car = [t.car_brand, t.car_color, t.car_plate].filter(Boolean).join(' · ');
  if (car) lines.push(`🚙 ${car}`);
  lines.push('', '_Si no te respondo en 1h, contáctame._');
  return lines.join('\n');
}

// Abre Google Maps con la ruta. Funciona web y mobile (deeplink → app nativa de mapas).
export function openMapDirections(origin: string, destination: string) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function shareTrip(t: ShareTrip) {
  const text = buildTripMessage(t);
  // 1) Native share sheet (móvil moderno)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Mi viaje en carpool', text });
      return;
    } catch { /* user cancelled */ }
  }
  // 2) WhatsApp fallback
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}
