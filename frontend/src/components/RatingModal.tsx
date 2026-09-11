import { useState } from 'react';
import { Star, X } from '@phosphor-icons/react';
import api from '../api';
import { useToast } from '../context/ToastContext';

interface Props {
  bookingId: number;
  rateeName: string;
  rateeRole: 'driver' | 'passenger';
  onClose: () => void;
  onDone?: () => void;
}

export default function RatingModal({ bookingId, rateeName, rateeRole, onClose, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const submit = async () => {
    if (rating < 1) return;
    setSaving(true);
    try {
      await api.post('/ratings', { booking_id: bookingId, rating, comment });
      showToast('¡Gracias por tu calificación!');
      onDone?.();
      onClose();
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al calificar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-fg font-bold text-lg">Califica al {rateeRole === 'driver' ? 'conductor' : 'pasajero'}</h2>
            <p className="text-fg-faint text-sm mt-0.5">{rateeName}</p>
          </div>
          <button onClick={onClose} className="text-fg-faint hover:text-fg"><X size={18} weight="bold" /></button>
        </div>

        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={36}
                weight={n <= (hover || rating) ? 'fill' : 'regular'}
                className={n <= (hover || rating) ? 'text-star' : 'text-fg-faint'}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Cuéntale a otros usuarios cómo estuvo (opcional)"
          rows={3}
          maxLength={500}
          className="w-full bg-subtle text-fg placeholder-fg-faint px-4 py-3 rounded-xl text-sm resize-none focus:ring-2 focus:ring-fg outline-none"
        />

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 border border-line-strong text-fg-muted py-2.5 rounded-xl text-sm hover:border-line-strong transition-colors">
            Después
          </button>
          <button
            onClick={submit}
            disabled={rating < 1 || saving}
            className="flex-1 bg-primary text-on-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-subtle disabled:opacity-40 transition-colors"
          >
            {saving ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
