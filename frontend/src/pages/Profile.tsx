import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LockSimple, User, Phone, Envelope, ArrowLeft, Check, WarningCircle, Car, Users, Star, Eye, EyeSlash, X } from '@phosphor-icons/react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { parseDate } from '../utils/date';
import VerifyEmailBanner, { VerifiedBadge } from '../components/VerifyEmailBanner';
import { ProfileSkeleton, RatingsSkeleton } from '../components/Skeleton';
import { checkPassword, passwordError, PASSWORD_MIN } from '../utils/password';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  created_at: string;
  trips_as_driver: number;
  trips_as_passenger: number;
  cancellations: number;
  late_cancellations: number;
  // null = todavía no se sabe (falta la migración). No se afirma nada.
  email_verified: boolean | null;
}

interface Rating {
  rating: number;
  comment: string | null;
  created_at: string;
  rater_name: string;
  type: 'passenger_to_driver' | 'driver_to_passenger';
}

interface RatingStats {
  avg: number;
  count: number;
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const confirmDialog = useConfirm();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwVisible, setPwVisible] = useState({ current: false, next: false, confirm: false });

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [ratingsFailed, setRatingsFailed] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [showAllRatings, setShowAllRatings] = useState(false);

  useEffect(() => {
    api.get('/profile')
      .then(({ data }) => {
        setProfile(data);
        setEditName(data.name);
        setEditPhone(data.phone || '');
        updateUser({ role: data.role });
        // Cargar calificaciones recibidas (en paralelo, no bloquea el perfil)
        Promise.all([
          api.get(`/ratings/user/${data.id}`),
          api.get(`/ratings/user/${data.id}/list`),
        ]).then(([statsRes, listRes]) => {
          setRatingStats(statsRes.data);
          setRatings(listRes.data);
        }).catch(() => {
          // No bloquear el perfil si fallan las calificaciones, pero decirlo:
          // si no, el esqueleto se quedaría brillando para siempre.
          setRatingsFailed(true);
        });
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) {
          logout();
          navigate('/login');
        } else {
          setFetchError('No se pudo cargar la información del perfil.');
        }
      });
  }, []);

  const saveInfo = async () => {
    setSaving(true);
    setInfoMsg(null);
    try {
      const { data } = await api.put('/profile', { name: editName, phone: editPhone });
      updateUser({ name: data.name, phone: data.phone });
      setProfile(prev => prev ? { ...prev, ...data } : prev);
      setInfoMsg({ type: 'ok', text: 'Información actualizada' });
    } catch (err: unknown) {
      setInfoMsg({ type: 'err', text: (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    const pwErr = passwordError(pwForm.next, pwForm.confirm);
    if (pwErr) {
      setPwMsg({ type: 'err', text: pwErr });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await api.put('/profile/password', { current_password: pwForm.current, new_password: pwForm.next });
      setPwMsg({ type: 'ok', text: 'Contraseña actualizada correctamente' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: unknown) {
      setPwMsg({ type: 'err', text: (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al cambiar contraseña' });
    } finally {
      setPwLoading(false);
    }
  };

  // Comprime la imagen en canvas: máx 1024px, calidad JPEG 0.85 (≈ 100-300 KB)
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        let b64 = canvas.toDataURL('image/jpeg', 0.85);
        // Si aún pesa demasiado (>3 MB en base64), bajar calidad
        if (b64.length > 3_000_000) b64 = canvas.toDataURL('image/jpeg', 0.70);
        if (b64.length > 3_000_000) b64 = canvas.toDataURL('image/jpeg', 0.50);
        resolve(b64);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Selecciona una imagen válida', 'error'); return; }
    setAvatarLoading(true);
    try {
      const base64 = await compressImage(file);
      await api.put('/profile/avatar', { avatar: base64 });
      updateUser({ avatar: base64 });
      setProfile(prev => prev ? { ...prev, avatar: base64 } : prev);
    } catch {
      showToast('No pudimos subir la foto', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  const changeRole = async (newRole: 'driver' | 'passenger') => {
    if (newRole === user?.role) return;
    const ok = await confirmDialog(newRole === 'driver'
      ? { title: '¿Cambiar a cuenta de conductor?', message: 'Vas a poder publicar y gestionar viajes.', confirmText: 'Sí, cambiar' }
      : { title: '¿Cambiar a cuenta de pasajero?', message: 'Solo vas a poder buscar y reservar viajes.', confirmText: 'Sí, cambiar' });
    if (!ok) return;
    setRoleLoading(true);
    try {
      await api.put('/profile/role', { role: newRole });
      updateUser({ role: newRole });
    } catch {
      showToast('No pudimos cambiar el tipo de cuenta', 'error');
    } finally {
      setRoleLoading(false);
    }
  };

  if (!profile) {
    if (!fetchError) {
      return (
        <div className="min-h-screen bg-canvas pt-20 px-6 pb-12">
          <div className="max-w-sm mx-auto mt-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-fg-faint hover:text-fg transition-colors text-sm mb-6">
              <ArrowLeft size={16} weight="bold" />
              Volver
            </button>
            <ProfileSkeleton />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center pt-16 gap-3">
        <p className="text-fg-muted text-sm">{fetchError}</p>
        <button onClick={() => navigate('/login')} className="text-fg underline text-sm">Volver al inicio</button>
      </div>
    );
  }

  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const newPwCheck  = checkPassword(pwForm.next);
  const canChangePw = !!pwForm.current && newPwCheck.valid && pwForm.next === pwForm.confirm;

  return (
    <div className="min-h-screen bg-canvas pt-20 px-6 pb-12">
      <div className="max-w-sm mx-auto mt-4">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-fg-faint hover:text-fg transition-colors text-sm mb-6">
          <ArrowLeft size={16} weight="bold" />
          Volver
        </button>

        {profile.email_verified === false && (
          <VerifyEmailBanner
            email={profile.email}
            onVerified={() => setProfile(p => (p ? { ...p, email_verified: true } : p))}
          />
        )}

        {/* Avatar section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-subtle flex items-center justify-center">
              {profile.avatar ? (
                <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-fg text-2xl font-bold">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
            >
              {avatarLoading
                ? <div className="w-4 h-4 border-2 border-line-strong border-t-line rounded-full animate-spin" />
                : <Camera size={14} weight="duotone" className="text-on-primary" />
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <h2 className="text-fg font-bold text-lg">{profile.name}</h2>
          <p className="text-fg-faint text-sm">{profile.email}</p>
          {profile.email_verified === true && <div className="mt-1"><VerifiedBadge /></div>}
          <p className="text-fg-faint text-xs mt-1">
            Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>

          {/* Resumen de actividad. Las cancelaciones tardías se muestran solo
              a quien es dueño de la cuenta: sirven para corregirse. */}
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <p className="text-fg font-bold tabular-nums">
                {(profile.trips_as_driver ?? 0) + (profile.trips_as_passenger ?? 0)}
              </p>
              <p className="text-fg-faint text-[10px] uppercase tracking-wider">Viajes</p>
            </div>
            <div className="w-px h-8 bg-subtle" />
            <div className="text-center">
              <p className="text-fg font-bold tabular-nums">{ratingStats?.count ?? 0}</p>
              <p className="text-fg-faint text-[10px] uppercase tracking-wider">Reseñas</p>
            </div>
            <div className="w-px h-8 bg-subtle" />
            <div className="text-center">
              <p className={`font-bold tabular-nums ${
                (profile.late_cancellations ?? 0) > 0 ? 'text-star' : 'text-fg'
              }`}>
                {profile.cancellations ?? 0}
              </p>
              <p className="text-fg-faint text-[10px] uppercase tracking-wider">Cancelaciones</p>
            </div>
          </div>

          {(profile.late_cancellations ?? 0) > 0 && (
            <p className="text-star text-[11px] mt-3 text-center leading-relaxed max-w-[15rem]">
              {profile.late_cancellations} {profile.late_cancellations === 1 ? 'fue' : 'fueron'} con menos
              de 2 horas de aviso. Cancelar temprano le da tiempo al otro de buscar alternativa.
            </p>
          )}
        </div>

        {/* Info section */}
        <section className="mb-6">
          <h3 className="text-fg-muted text-xs font-semibold uppercase tracking-wider mb-3">Información personal</h3>
          <div className="bg-surface rounded-2xl overflow-hidden space-y-0">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
              <User size={15} weight="duotone" className="text-fg-faint flex-shrink-0" />
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 bg-transparent text-fg text-sm focus:outline-none"
                placeholder="Nombre completo"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
              <Envelope size={15} weight="duotone" className="text-fg-faint flex-shrink-0" />
              <span className="text-fg-faint text-sm flex-1 truncate">{profile.email}</span>
              <span className="text-fg-faint text-xs">No editable</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Phone size={15} weight="duotone" className="text-fg-faint flex-shrink-0" />
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="flex-1 bg-transparent text-fg text-sm focus:outline-none"
                placeholder="Teléfono (opcional)"
              />
            </div>
          </div>

          {infoMsg && (
            <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-xs ${
              infoMsg.type === 'ok' ? 'bg-live-soft text-live' : 'bg-danger-soft text-danger'
            }`}>
              {infoMsg.type === 'ok' ? <Check size={13} weight="bold" /> : <WarningCircle size={13} weight="duotone" />}
              {infoMsg.text}
            </div>
          )}

          <button
            onClick={saveInfo}
            disabled={saving}
            className="w-full mt-3 bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </section>

        {/* Calificaciones recibidas */}
        <section className="mb-6">
          <h3 className="text-fg-muted text-xs font-semibold uppercase tracking-wider mb-3">Calificaciones</h3>

          {ratingStats === null ? (
            ratingsFailed ? (
              <div className="bg-surface rounded-2xl p-5 text-center">
                <p className="text-fg-muted text-sm">No pudimos cargar las calificaciones.</p>
              </div>
            ) : (
              <RatingsSkeleton />
            )
          ) : ratingStats.count === 0 ? (
            <div className="bg-surface rounded-2xl p-5 text-center">
              <Star size={28} weight="duotone" className="text-fg-faint mx-auto mb-2" />
              <p className="text-fg-faint text-sm font-medium">Sin calificaciones aún</p>
              <p className="text-fg-faint text-xs mt-1">Completa viajes para recibir calificaciones</p>
            </div>
          ) : (
            <>
              {/* Resumen: promedio + total */}
              <div className="bg-surface rounded-2xl p-5 mb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-fg tabular-nums">
                      {Number(ratingStats.avg ?? 0).toFixed(1)}
                    </span>
                    <span className="text-fg-faint text-sm">/ 5</span>
                  </div>
                  <p className="text-fg-faint text-xs mt-1">
                    {ratingStats.count} calificación{ratingStats.count !== 1 ? 'es' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <Star
                      key={n}
                      size={18}
                      weight={n <= Math.round(ratingStats.avg) ? 'fill' : 'duotone'}
                      className={n <= Math.round(ratingStats.avg) ? 'text-star' : 'text-fg-faint'}
                    />
                  ))}
                </div>
              </div>

              {/* Lista de calificaciones */}
              <div className="space-y-2">
                {(showAllRatings ? ratings : ratings.slice(0, 3)).map((r, i) => (
                  <div key={i} className="bg-surface rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center flex-shrink-0">
                          <span className="text-fg text-xs font-bold">
                            {r.rater_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-fg text-sm font-medium truncate">{r.rater_name}</p>
                          <p className="text-fg-faint text-[10px]">
                            {r.type === 'passenger_to_driver' ? 'Pasajero' : 'Conductor'} ·{' '}
                            {parseDate(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {[1,2,3,4,5].map(n => (
                          <Star
                            key={n}
                            size={11}
                            weight={n <= r.rating ? 'fill' : 'duotone'}
                            className={n <= r.rating ? 'text-star' : 'text-fg-faint'}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-fg-muted text-xs leading-relaxed">"{r.comment}"</p>
                    )}
                  </div>
                ))}

                {ratings.length > 3 && (
                  <button
                    onClick={() => setShowAllRatings(v => !v)}
                    className="w-full text-fg-faint hover:text-fg text-xs py-2 transition-colors"
                  >
                    {showAllRatings ? 'Ver menos' : `Ver todas (${ratings.length})`}
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        {/* Password section */}
        <section className="mb-8">
          <h3 className="text-fg-muted text-xs font-semibold uppercase tracking-wider mb-3">Cambiar contraseña</h3>
          <div className="bg-surface rounded-2xl overflow-hidden space-y-0">
            {([
              { key: 'current', placeholder: 'Contraseña actual',           autoComplete: 'current-password' },
              { key: 'next',    placeholder: 'Nueva contraseña',            autoComplete: 'new-password' },
              { key: 'confirm', placeholder: 'Confirmar nueva contraseña',  autoComplete: 'new-password' },
            ] as const).map(({ key, placeholder, autoComplete }, i) => (
              <div key={key} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-line' : ''}`}>
                <LockSimple size={15} weight="duotone" className="text-fg-faint flex-shrink-0" />
                <input
                  type={pwVisible[key] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                  placeholder={placeholder}
                  autoComplete={autoComplete}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="flex-1 bg-transparent text-fg text-sm focus:outline-none placeholder-fg-faint min-w-0"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setPwVisible(v => ({ ...v, [key]: !v[key] }))}
                  aria-label={pwVisible[key] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="text-fg-faint hover:text-fg transition-colors flex-shrink-0"
                >
                  {pwVisible[key]
                    ? <EyeSlash size={16} weight="duotone" />
                    : <Eye size={16} weight="duotone" />}
                </button>
              </div>
            ))}
          </div>

          {/* Requisitos en vivo de la nueva contraseña */}
          {pwForm.next.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
              <span className={`text-xs flex items-center gap-1.5 ${newPwCheck.minLength ? 'text-live' : 'text-fg-faint'}`}>
                {newPwCheck.minLength ? <Check size={11} weight="bold" /> : <X size={11} weight="bold" />}
                Mínimo {PASSWORD_MIN} caracteres
              </span>
              <span className={`text-xs flex items-center gap-1.5 ${newPwCheck.hasNumber ? 'text-live' : 'text-fg-faint'}`}>
                {newPwCheck.hasNumber ? <Check size={11} weight="bold" /> : <X size={11} weight="bold" />}
                Al menos un número
              </span>
              {pwForm.confirm.length > 0 && (
                <span className={`text-xs flex items-center gap-1.5 ${pwForm.next === pwForm.confirm ? 'text-live' : 'text-danger'}`}>
                  {pwForm.next === pwForm.confirm ? <Check size={11} weight="bold" /> : <X size={11} weight="bold" />}
                  Coinciden
                </span>
              )}
            </div>
          )}

          {pwMsg && (
            <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-xs ${
              pwMsg.type === 'ok' ? 'bg-live-soft text-live' : 'bg-danger-soft text-danger'
            }`}>
              {pwMsg.type === 'ok' ? <Check size={13} weight="bold" /> : <WarningCircle size={13} weight="duotone" />}
              {pwMsg.text}
            </div>
          )}

          <button
            onClick={changePassword}
            disabled={pwLoading || !canChangePw}
            className="w-full mt-3 bg-subtle hover:bg-line-strong text-fg font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors text-sm"
          >
            {pwLoading ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </section>

        {/* Account type */}
        <section className="mb-6">
          <h3 className="text-fg-muted text-xs font-semibold uppercase tracking-wider mb-3">Tipo de cuenta</h3>
          <div className="space-y-2">
            {([
              { value: 'driver' as const, label: 'Conductor', desc: 'Puedes publicar y gestionar viajes', Icon: Car },
              { value: 'passenger' as const, label: 'Pasajero', desc: 'Solo puedes buscar y reservar viajes', Icon: Users },
            ]).map(({ value, label, desc, Icon }) => {
              const isSelected = user?.role === value;
              return (
                <button
                  key={value}
                  onClick={() => changeRole(value)}
                  disabled={roleLoading}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left disabled:opacity-60 ${
                    isSelected ? 'bg-primary border-primary' : 'bg-surface border-line hover:border-line-strong'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-canvas' : 'bg-subtle'}`}>
                    <Icon size={18} weight="duotone" className={isSelected ? 'text-fg' : 'text-fg-muted'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-on-primary' : 'text-fg'}`}>{label}</p>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-fg-faint' : 'text-fg-faint'}`}>{desc}</p>
                  </div>
                  {isSelected && <Check size={16} weight="bold" className="text-on-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <p className="text-fg-faint text-xs mt-2 px-1">Puedes cambiar tu tipo de cuenta en cualquier momento.</p>
        </section>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="w-full border border-line text-danger py-3 rounded-xl text-sm hover:bg-surface transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
