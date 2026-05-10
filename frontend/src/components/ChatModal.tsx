import { useState, useEffect, useRef } from 'react';
import { X, PaperPlaneRight, HandWaving } from '@phosphor-icons/react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
  created_at: string;
}

interface Props {
  bookingId: number;
  onClose: () => void;
}

export default function ChatModal({ bookingId, onClose }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState('');
  const [bookingStatus, setBookingStatus] = useState<string>('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get(`/messages/booking/${bookingId}`);
      setMessages(data.messages);
      setOtherName(data.other_name);
      setBookingStatus(data.booking_status);
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    const i = setInterval(fetchMessages, 3500);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/booking/${bookingId}`, { text });
      setMessages(prev => [...prev, data]);
      setInput('');
    } catch {}
    finally { setSending(false); }
  };

  const formatTime = (s: string) => new Date(s + 'Z').toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const disabled = ['cancelled', 'rejected'].includes(bookingStatus);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-zinc-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-t sm:border border-zinc-800 flex flex-col h-[80vh] sm:h-[600px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold">{otherName || 'Cargando...'}</h2>
            <p className="text-zinc-600 text-[11px]">Reserva #{bookingId}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} weight="bold" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 flex flex-col items-center gap-2">
              <HandWaving size={20} weight="duotone" className="text-zinc-600" />
              <p className="text-zinc-600 text-sm">No hay mensajes aún. Saluda.</p>
            </div>
          ) : messages.map(m => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-zinc-600' : 'text-zinc-500'}`}>{formatTime(m.created_at)}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {disabled ? (
          <div className="p-3 border-t border-zinc-800 text-center text-zinc-600 text-xs">
            Esta reserva ya fue cancelada
          </div>
        ) : (
          <div className="p-3 border-t border-zinc-800 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Escribe un mensaje..."
              maxLength={500}
              className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-xl text-sm focus:ring-2 focus:ring-white outline-none"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="bg-white text-black p-2 rounded-xl hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              <PaperPlaneRight size={16} weight="duotone" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
