import type { ReactNode } from 'react';

/**
 * Esqueletos de carga.
 *
 * Cada uno repite la forma de lo que va a llegar (dónde va la hora, el
 * precio, la foto), así la pantalla no salta cuando aparecen los datos y se
 * entiende qué se está cargando. Antes había un spinner en unas pantallas,
 * la palabra "Cargando..." en otras y bloques grises sin forma en otras.
 *
 * Las medidas copian las del componente real. Si una tarjeta cambia de
 * estructura, su esqueleto tiene que cambiar con ella.
 */

/** Una pieza gris. Para texto lleva la altura del renglón; para bloques, su caja. */
export function Bone({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} />;
}

/**
 * Envoltorio de toda zona en carga. Anuncia la carga a los lectores de
 * pantalla y entra con un pequeño retraso (`.loading-in`): si los datos
 * llegan enseguida, el esqueleto no alcanza a verse y no hay parpadeo.
 */
export function Loading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`loading-in ${className}`}>
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  );
}

/** Repite un esqueleto `count` veces con el espaciado de las listas. */
export function List({ count = 3, gap = 'space-y-3', children }: {
  count?: number;
  gap?: string;
  children: ReactNode;
}) {
  return (
    <Loading className={gap}>
      {Array.from({ length: count }, (_, i) => <div key={i}>{children}</div>)}
    </Loading>
  );
}

// ── Piezas compartidas ─────────────────────────────────────────────────────

/** El trayecto dentro de su caja gris, como RouteLine: círculo, línea, cuadrado. */
function Route({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-subtle rounded-xl p-3 flex items-stretch gap-3 ${className}`}>
      <div className="flex flex-col items-center py-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-fg/15" />
        <span className="w-px flex-1 my-1 bg-fg/10 min-h-[20px]" />
        <span className="w-2.5 h-2.5 bg-fg/15" />
      </div>
      <div className="flex-1 flex flex-col justify-between gap-3 py-0.5">
        <div className="flex items-center justify-between gap-2">
          <Bone className="h-3.5 w-3/5 rounded-full" />
          <Bone className="h-3 w-10 rounded-full" />
        </div>
        <Bone className="h-3.5 w-2/5 rounded-full" />
      </div>
    </div>
  );
}

/** Foto, nombre y una línea de detalle, como DriverRow. */
function Person({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const avatar = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' }[size];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Bone className={`${avatar} rounded-full flex-shrink-0`} />
      <div className="flex-1 space-y-2">
        <Bone className="h-3.5 w-28 rounded-full" />
        <Bone className="h-3 w-40 rounded-full" />
      </div>
    </div>
  );
}

// ── Tarjetas ───────────────────────────────────────────────────────────────

/** RideCard: hora y precio, trayecto, conductor, cupos y acción. */
export function RideCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-line shadow-card">
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="space-y-2">
          <Bone className="h-7 w-24 rounded-lg" />
          <Bone className="h-4 w-20 rounded-md" />
        </div>
        <div className="space-y-2 flex flex-col items-end">
          <Bone className="h-7 w-20 rounded-lg" />
          <Bone className="h-3 w-16 rounded-full" />
        </div>
      </div>
      <Route className="mb-3.5" />
      <Person size="sm" className="mb-3.5" />
      <div className="pt-3 border-t border-line">
        <Bone className="h-3 w-24 rounded-full" />
      </div>
      <Bone className="h-11 w-full rounded-xl mt-3.5" />
    </div>
  );
}

/** El próximo viaje en Inicio: hora, trayecto y botón. */
export function NextTripSkeleton() {
  return (
    <Loading className="bg-surface rounded-2xl border border-line shadow-card p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-24 rounded-lg" />
        <Bone className="h-3 w-16 rounded-full" />
      </div>
      <Route />
      <Bone className="h-11 w-full rounded-xl" />
    </Loading>
  );
}

/** Reserva del pasajero en Mis reservas. */
export function BookingCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl p-5 border border-line">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-3/4 rounded-full" />
          <Bone className="h-3 w-5/6 rounded-full" />
          <Bone className="h-3 w-1/2 rounded-full" />
        </div>
        <Bone className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex items-center justify-between mt-3">
        <Bone className="h-4 w-28 rounded-full" />
        <Bone className="h-3 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Solicitud de un pasajero, vista por el conductor. */
export function RequestCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-line overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-subtle space-y-2">
        <Bone className="h-3.5 w-2/3 rounded-full" />
        <Bone className="h-3 w-1/3 rounded-full" />
      </div>
      <div className="px-4 py-4 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Bone className="h-3.5 w-28 rounded-full" />
          <Bone className="h-3 w-36 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-8 w-[4.5rem] rounded-lg" />
          <Bone className="h-8 w-[4.5rem] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Conversación en Mensajes: foto, nombre y hora, trayecto, último mensaje. */
export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-4 bg-surface border border-line">
      <Bone className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Bone className="h-3.5 w-28 rounded-full" />
          <Bone className="h-2.5 w-8 rounded-full" />
        </div>
        <Bone className="h-3 w-40 rounded-full" />
        <Bone className="h-3 w-3/4 rounded-full" />
      </div>
    </div>
  );
}

/** Aviso en Notificaciones: icono, título, mensaje y hace cuánto. */
export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 bg-surface rounded-2xl p-4 border border-line">
      <Bone className="w-5 h-5 rounded-md flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3.5 w-1/2 rounded-full" />
        <Bone className="h-3 w-full rounded-full" />
        <Bone className="h-3 w-2/3 rounded-full" />
        <Bone className="h-2.5 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Historial: los dos totales y la lista de viajes cerrados. */
export function HistorySkeleton() {
  return (
    <Loading>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-surface rounded-2xl p-4 space-y-2">
            <Bone className="h-2.5 w-20 rounded-full" />
            <Bone className="h-6 w-24 rounded-lg" />
            <Bone className="h-3 w-14 rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surface rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 space-y-2">
                <Bone className="h-3.5 w-3/4 rounded-full" />
                <Bone className="h-3 w-1/2 rounded-full" />
              </div>
              <Bone className="h-3.5 w-14 rounded-full" />
            </div>
            <Bone className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** Resumen de calificaciones en Perfil: promedio grande y estrellas. */
export function RatingsSkeleton() {
  return (
    <Loading className="bg-surface rounded-2xl p-5 flex items-center justify-between">
      <div className="space-y-2">
        <Bone className="h-8 w-16 rounded-lg" />
        <Bone className="h-3 w-24 rounded-full" />
      </div>
      <Bone className="h-[18px] w-24 rounded-full" />
    </Loading>
  );
}

// ── Pantallas completas ────────────────────────────────────────────────────

/** Mientras se descarga una pantalla: título y tres tarjetas, que es la forma más común. */
export function PageSkeleton() {
  return (
    <Loading className="min-h-screen bg-canvas pt-20 px-6">
      <div className="max-w-sm mx-auto mt-4 space-y-3">
        <Bone className="h-7 w-40 rounded-lg" />
        <Bone className="h-3.5 w-56 rounded-full" />
        <div className="pt-3 space-y-3">
          {[0, 1, 2].map((i) => <Bone key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      </div>
    </Loading>
  );
}

/** Perfil: foto, nombre, actividad y la tarjeta de datos personales. */
export function ProfileSkeleton() {
  return (
    <Loading>
      <div className="flex flex-col items-center mb-8">
        <Bone className="w-24 h-24 rounded-full mb-3" />
        <Bone className="h-5 w-40 rounded-full mb-2" />
        <Bone className="h-3.5 w-52 rounded-full mb-2" />
        <Bone className="h-3 w-32 rounded-full" />
        <div className="flex items-center gap-6 mt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Bone className="h-4 w-6 rounded-md" />
              <Bone className="h-2.5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <Bone className="h-3 w-36 rounded-full mb-3" />
      <div className="bg-surface rounded-2xl overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-line' : ''}`}>
            <Bone className="w-4 h-4 rounded" />
            <Bone className="h-3.5 w-44 rounded-full" />
          </div>
        ))}
      </div>
      <Bone className="h-11 w-full rounded-xl mt-3" />
    </Loading>
  );
}

/** Formulario de Editar viaje: vehículo, ruta, recurrencia, fecha, hora, cupos y precio. */
export function RideFormSkeleton() {
  const field = (labelWidth: string) => (
    <div>
      <Bone className={`h-3 ${labelWidth} rounded-full mb-2`} />
      <Bone className="h-12 w-full rounded-xl" />
    </div>
  );
  return (
    <Loading className="space-y-4">
      <div>
        <Bone className="h-3 w-16 rounded-full mb-2" />
        <div className="flex gap-2">
          <Bone className="h-11 flex-1 rounded-xl" />
          <Bone className="h-11 flex-1 rounded-xl" />
        </div>
      </div>
      <div>
        <Bone className="h-3 w-10 rounded-full mb-2" />
        <Bone className="h-[104px] w-full rounded-2xl" />
      </div>
      <Bone className="h-[62px] w-full rounded-xl" />
      {field('w-12')}
      {field('w-24')}
      <div className="grid grid-cols-2 gap-3">
        {field('w-16')}
        {field('w-16')}
      </div>
      <Bone className="h-14 w-full rounded-xl" />
    </Loading>
  );
}

/** Formulario de Mi vehículo: marca, color y placa en una tarjeta. */
export function VehicleFormSkeleton() {
  return (
    <Loading>
      <div className="bg-surface rounded-2xl mb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-line' : ''}`}>
            <Bone className="w-4 h-4 rounded" />
            <Bone className="h-3.5 w-48 rounded-full" />
          </div>
        ))}
      </div>
      <Bone className="h-[76px] w-full rounded-xl mb-6" />
      <Bone className="h-11 w-full rounded-xl" />
    </Loading>
  );
}

/** Calificar: la persona, las cinco estrellas y el comentario. */
export function RateTripSkeleton() {
  return (
    <Loading className="min-h-screen bg-canvas px-6 py-12">
      <div className="max-w-sm mx-auto w-full flex flex-col items-center">
        <Bone className="h-6 w-36 rounded-full mb-4" />
        <Bone className="h-3.5 w-48 rounded-full mb-8" />
        <Bone className="w-24 h-24 rounded-full mb-3" />
        <Bone className="h-5 w-40 rounded-full mb-2" />
        <Bone className="h-3.5 w-24 rounded-full" />
        <Bone className="h-3.5 w-44 rounded-full mt-6 mb-4" />
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4].map((i) => <Bone key={i} className="w-[42px] h-[42px] rounded-full" />)}
        </div>
        <Bone className="h-[76px] w-full rounded-xl mb-4" />
        <Bone className="h-14 w-full rounded-xl" />
      </div>
    </Loading>
  );
}

/** Viaje confirmado o en curso: estado, persona, trayecto, mensaje y acción. */
export function TripSkeleton() {
  return (
    <Loading className="min-h-screen bg-canvas px-5 pt-20 max-w-md mx-auto w-full">
      <Bone className="h-4 w-20 rounded-full mb-5" />
      <Bone className="h-[68px] w-full rounded-2xl mb-4" />
      <div className="bg-surface rounded-2xl border border-line shadow-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Person size="lg" className="flex-1" />
          <Bone className="w-11 h-11 rounded-full flex-shrink-0" />
        </div>
        <Route />
        <Bone className="h-11 w-full rounded-xl" />
        <div className="flex items-end justify-between pt-3 border-t border-line">
          <div className="space-y-2">
            <Bone className="h-2.5 w-20 rounded-full" />
            <Bone className="h-7 w-24 rounded-lg" />
          </div>
          <Bone className="h-3 w-16 rounded-full" />
        </div>
        <Bone className="h-14 w-full rounded-xl" />
      </div>
    </Loading>
  );
}

/** Chat: burbujas alternadas, las del otro con su inicial al lado. */
export function ChatSkeleton() {
  const bubbles: { mine: boolean; w: string; h: string }[] = [
    { mine: false, w: 'w-44', h: 'h-10' },
    { mine: true,  w: 'w-36', h: 'h-10' },
    { mine: false, w: 'w-56', h: 'h-16' },
    { mine: true,  w: 'w-28', h: 'h-10' },
    { mine: false, w: 'w-40', h: 'h-10' },
  ];
  return (
    <Loading className="space-y-3">
      {bubbles.map((b, i) => (
        <div key={i} className={`flex items-end gap-2 ${b.mine ? 'justify-end' : 'justify-start'}`}>
          {!b.mine && <Bone className="w-7 h-7 rounded-full flex-shrink-0" />}
          <Bone className={`${b.w} ${b.h} rounded-2xl ${b.mine ? 'rounded-br-sm' : 'rounded-bl-sm'}`} />
        </div>
      ))}
    </Loading>
  );
}
