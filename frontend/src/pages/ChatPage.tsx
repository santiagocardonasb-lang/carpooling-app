import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PaperPlaneRight, HandWaving } from '@phosphor-icons/react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { parseDate } from '../utils/date';

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
  created_at: string;
}

export default function ChatPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fatalRef = useRef(false);

  // Marca mensajes como vistos: timestamp local + persiste en backend (last_read_at)
  useEffect(() => {
    if (bookingId) {
      sessionStorage.setItem(`chat_last_seen_${bookingId}`, Date.now().toString());
      api.patch(`/messages/booking/${bookingId}/read`).catch(() => {});
    }
  }, [bookingId]);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get(`/messages/booking/${bookingId}`);
      setMessages(data.messages || []);
      setOtherName(data.other_name || '');
      setBookingStatus(data.booking_status || '');
      setError(null);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      // 403/404 son errores fatales (reserva no es tuya / no existe) → cerrar
      if (status === 403 || status === 404) {
        fatalRef.current = true;
        setError('No tienes acceso a este chat');
      } else {
        // Errores transitorios (red, timeout, 500) → mostrar pero no expulsar
        console.warn('Chat fetch error:', e);
        setError('Sin conexión — reintentando...');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const i = setInterval(() => {
      if (!fatalRef.current) fetchMessages();
    }, 3500);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/booking/${bookingId}`, { text });
      // Evitar duplicados: si el polling ya lo agregó, no añadir otra vez
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
      setInput('');
      sessionStorage.setItem(`chat_last_seen_${bookingId}`, Date.now().toString());
      // Re-marcar como leído (mantiene last_read_at actualizado)
      api.patch(`/messages/booking/${bookingId}/read`).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e: unknown) {
      const errMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'No se pudo enviar el mensaje';
      showToast(errMsg, 'error');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (s: string) =>
    parseDate(s).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const canChat = !['cancelled', 'rejected'].includes(bookingStatus);

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-line glass-bar sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-fg-faint hover:text-fg transition-colors p-1 -ml-1 flex-shrink-0"
        >
          <ArrowLeft size={22} weight="bold" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-fg font-bold truncate">
            {loading ? 'Cargando...' : otherName}
          </h2>
          <p className="text-fg-faint text-xs">
            {bookingStatus === 'in_progress' ? '🚗 Viaje en curso' : bookingStatus === 'confirmed' ? '✓ Reserva confirmada' : ''}
          </p>
        </div>
      </div>

      {/* Banner de error transitorio */}
      {error && !fatalRef.current && (
        <div className="bg-danger-soft border-b border-danger/30 px-4 py-2 text-center text-danger text-xs">
          {error}
        </div>
      )}
      {fatalRef.current && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-danger text-sm mb-3">{error}</p>
            <button onClick={() => navigate(-1)} className="text-fg text-sm underline">Volver</button>
          </div>
        </div>
      )}

      {/* Messages */}
      {!fatalRef.current && (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-line-strong border-t-fg rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-3">
              <HandWaving size={22} weight="duotone" className="text-fg-faint" />
            </div>
            <p className="text-fg-faint text-sm">No hay mensajes aún</p>
            <p className="text-fg-faint text-xs mt-1">Saluda a {otherName?.split(' ')[0]}</p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && (
                  <div className="w-7 h-7 rounded-full bg-subtle flex items-center justify-center text-xs text-fg font-bold flex-shrink-0">
                    {m.sender_name[0]?.toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[78%]`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : 'bg-subtle text-fg rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>
                  </div>
                  <p className={`text-[10px] mt-1 text-fg-faint ${mine ? 'text-right' : ''}`}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      )}

      {/* Input */}
      {!fatalRef.current && canChat ? (
        <div className="px-4 py-3 border-t border-line flex gap-2 bg-canvas">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={`Mensaje a ${otherName?.split(' ')[0] || '...'}...`}
            maxLength={500}
            className="flex-1 bg-surface text-fg px-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-fg outline-none placeholder-fg-faint"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="bg-primary text-on-primary p-3 rounded-2xl hover:bg-subtle disabled:opacity-40 transition-all active:scale-95 flex-shrink-0"
          >
            <PaperPlaneRight size={18} weight="duotone" />
          </button>
        </div>
      ) : !fatalRef.current ? (
        <div className="px-4 py-4 border-t border-line text-center text-fg-faint text-xs bg-canvas">
          Esta reserva ya no está activa
        </div>
      ) : null}
    </div>
  );
}
