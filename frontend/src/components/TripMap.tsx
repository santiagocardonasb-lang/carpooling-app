import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Clock } from '@phosphor-icons/react';

interface Props {
  driverLat: number | null;
  driverLng: number | null;
  destination: string;
  isDriver: boolean;
}

// Convierte nombre de ciudad → coordenadas usando Nominatim (OpenStreetMap, gratis)
async function geocode(place: string): Promise<[number, number] | null> {
  try {
    const q = encodeURIComponent(`${place}, Colombia`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    if (!data[0]) return null;
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  } catch {
    return null;
  }
}

// Calcula ruta real por calles + ETA usando OSRM (gratuito, open source)
async function fetchRoute(from: [number, number], to: [number, number]) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[0]},${from[1]};${to[0]},${to[1]}` +
      `?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      return {
        geometry: data.routes[0].geometry,           // GeoJSON LineString
        duration: data.routes[0].duration as number, // segundos
        distance: data.routes[0].distance as number, // metros
      };
    }
    return null;
  } catch {
    return null;
  }
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return 'Llegando...';
  const mins = Math.round(seconds / 60);
  if (mins < 1) return 'Llegando...';
  if (mins === 1) return '~1 min';
  return `~${mins} min`;
}

export default function TripMap({ driverLat, driverLng, destination, isDriver }: Props) {
  const containerRef     = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef  = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef    = useRef<maplibregl.Marker | null>(null);
  const routeReadyRef    = useRef(false);

  const [eta, setEta]             = useState<string | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady]   = useState(false);
  const [geoError, setGeoError]   = useState(false);

  // ── 1. Geocodificar destino (una sola vez) ───────────────────────────────
  useEffect(() => {
    geocode(destination).then(coords => {
      if (coords) setDestCoords(coords);
      else setGeoError(true);
    });
  }, [destination]);

  // ── 2. Inicializar el mapa (una sola vez) ───────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = driverLng && driverLat
      ? [driverLng, driverLat]
      : [-74.0836, 4.6977]; // Colombia (Bogotá)

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center,
      zoom: driverLat ? 13 : 6,
      attributionControl: false,
    });

    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );
    m.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    m.on('load', () => {
      // Source de la ruta
      m.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: {},
        },
      });

      // Sombra de la línea (más gruesa, transparente)
      m.addLayer({
        id: 'route-shadow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.15 },
      });

      // Línea principal
      m.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-opacity': 0.85 },
      });

      routeReadyRef.current = true;
      setMapReady(true);
    });

    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current   = null;
      driverMarkerRef.current = null;
      destMarkerRef.current   = null;
      routeReadyRef.current   = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 3. Marcador de destino ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !destCoords) return;
    if (destMarkerRef.current) return; // ya existe

    const el = document.createElement('div');
    el.style.cssText = `
      width: 14px; height: 14px;
      background: #ffffff; border-radius: 3px;
      border: 2px solid #000;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
    `;
    destMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(destCoords)
      .setPopup(
        new maplibregl.Popup({ offset: 16, closeButton: false })
          .setHTML(`<span style="color:#18181b;font-size:12px;font-weight:600">📍 ${destination}</span>`)
      )
      .addTo(mapRef.current);
  }, [mapReady, destCoords, destination]);

  // ── 4. Marcador del conductor + ruta + ETA (se actualiza en cada posición) ─
  useEffect(() => {
    if (!mapReady || !mapRef.current || !driverLat || !driverLng) return;
    const pos: [number, number] = [driverLng, driverLat];

    // Mover o crear el marcador del conductor
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat(pos);
    } else {
      const el = document.createElement('div');
      el.style.cssText = 'font-size:26px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7));';
      el.textContent = '🚗';
      driverMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(pos)
        .addTo(mapRef.current);
    }

    // Calcular ruta y ETA hacia el destino
    if (!destCoords || !routeReadyRef.current) {
      mapRef.current.easeTo({ center: pos, zoom: 14, duration: 800 });
      return;
    }

    fetchRoute(pos, destCoords).then(route => {
      if (!route || !mapRef.current) return;

      // Actualizar línea de ruta
      const src = mapRef.current.getSource('route') as maplibregl.GeoJSONSource | undefined;
      src?.setData(route.geometry);

      // ETA
      setEta(formatEta(route.duration));

      // Ajustar vista para incluir conductor y destino
      const bounds = new maplibregl.LngLatBounds(pos, pos);
      bounds.extend(destCoords);
      mapRef.current.fitBounds(bounds, {
        padding: { top: 70, bottom: 50, left: 50, right: 50 },
        duration: 1000,
        maxZoom: 15,
      });
    });
  }, [mapReady, driverLat, driverLng, destCoords]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-zinc-900">
      {/* Mapa */}
      <div ref={containerRef} style={{ height: '260px', width: '100%' }} />

      {/* ETA badge */}
      {eta && (
        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-zinc-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 pointer-events-none">
          <Clock size={13} weight="duotone" className="text-zinc-400" />
          <span className="text-white text-sm font-bold">{eta}</span>
          <span className="text-zinc-400 text-xs">al destino</span>
        </div>
      )}

      {/* Overlay: esperando GPS */}
      {!driverLat && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/70 backdrop-blur-sm gap-3">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm text-center px-6">
            Esperando ubicación del conductor…
          </p>
        </div>
      )}

      {/* Overlay: error de geocoding */}
      {geoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70">
          <p className="text-zinc-500 text-sm text-center px-6">
            No se pudo cargar el mapa para "{destination}"
          </p>
        </div>
      )}

      {/* Badge GPS activo (conductor) */}
      {isDriver && driverLat && (
        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm border border-zinc-700 px-2.5 py-1 rounded-lg pointer-events-none">
          <p className="text-zinc-400 text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            GPS activo
          </p>
        </div>
      )}
    </div>
  );
}
