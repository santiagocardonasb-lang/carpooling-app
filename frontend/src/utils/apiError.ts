// Traduce un error de axios a un mensaje que el usuario pueda entender.
//
// El caso importante es cuando `response` viene vacío: la petición nunca llegó
// al servidor (sin internet, backend dormido, o bloqueo de CORS). Antes eso se
// mostraba con el mensaje genérico de cada pantalla, que no decía nada útil.

interface AxiosLikeError {
  response?: { status?: number; data?: { error?: string } };
  code?: string;
}

export function apiError(err: unknown, fallback: string): string {
  const e = err as AxiosLikeError | undefined;

  // El backend explicó qué pasó: ese mensaje siempre gana.
  const fromServer = e?.response?.data?.error;
  if (fromServer) return fromServer;

  // Nunca hubo respuesta HTTP.
  if (!e?.response) {
    if (e?.code === 'ECONNABORTED')
      return 'El servidor tardó demasiado en responder. Intenta de nuevo.';
    return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }

  if (e.response.status === 429)
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  if (e.response.status && e.response.status >= 500)
    return 'El servidor tuvo un problema. Intenta de nuevo en unos segundos.';

  return fallback;
}
