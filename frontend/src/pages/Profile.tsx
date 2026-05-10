import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LockSimple, User, Phone, Envelope, ArrowLeft, Check, WarningCircle, Car, Users } from '@phosphor-icons/react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  created_at: string;
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
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

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    api.get('/profile')
      .then(({ data }) => {
        setProfile(data);
        setEditName(data.name);
        setEditPhone(data.phone || '');
        updateUser({ role: data.role });
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
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: 'Las contraseñas nuevas no coinciden' });
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
    if (!file.type.startsWith('image/')) { alert('Selecciona una imagen válida'); return; }
    setAvatarLoading(true);
    try {
      const base64 = await compressImage(file);
      await api.put('/profile/avatar', { avatar: base64 });
      updateUser({ avatar: base64 });
      setProfile(prev => prev ? { ...prev, avatar: base64 } : prev);
    } catch {
      alert('Error al subir la foto');
    } finally {
      setAvatarLoading(false);
    }
  };

  const changeRole = async (newRole: 'driver' | 'passenger') => {
    if (newRole === user?.role) return;
    if (!confirm(newRole === 'driver' ? '¿Cambiar a cuenta de conductor? Podrás publicar viajes.' : '¿Cambiar a cuenta de pasajero? Solo podrás buscar y reservar viajes.')) return;
    setRoleLoading(true);
    try {
      await api.put('/profile/role', { role: newRole });
      updateUser({ role: newRole });
    } catch {
      alert('Error al cambiar el tipo de cuenta');
    } finally {
      setRoleLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center pt-16 gap-3">
        {fetchError ? (
          <>
            <p className="text-zinc-400 text-sm">{fetchError}</p>
            <button onClick={() => navigate('/login')} className="text-white underline text-sm">Volver al inicio</button>
          </>
        ) : (
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        )}
      </div>
    );
  }

  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-black pt-20 px-6 pb-12">
      <div className="max-w-sm mx-auto mt-4">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft size={16} weight="bold" />
          Volver
        </button>

        {/* Avatar section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
              {profile.avatar ? (
                <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors shadow-lg"
            >
              {avatarLoading
                ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" />
                : <Camera size={14} weight="duotone" className="text-black" />
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <h2 className="text-white font-bold text-lg">{profile.name}</h2>
          <p className="text-zinc-500 text-sm">{profile.email}</p>
          <p className="text-zinc-700 text-xs mt-1">
            Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Info section */}
        <section className="mb-6">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Información personal</h3>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden space-y-0">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
              <User size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                placeholder="Nombre completo"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
              <Envelope size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />
              <span className="text-zinc-500 text-sm flex-1 truncate">{profile.email}</span>
              <span className="text-zinc-700 text-xs">No editable</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Phone size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                placeholder="Teléfono (opcional)"
              />
            </div>
          </div>

          {infoMsg && (
            <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-xs ${
              infoMsg.type === 'ok' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
            }`}>
              {infoMsg.type === 'ok' ? <Check size={13} weight="bold" /> : <WarningCircle size={13} weight="duotone" />}
              {infoMsg.text}
            </div>
          )}

          <button
            onClick={saveInfo}
            disabled={saving}
            className="w-full mt-3 bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </section>

        {/* Password section */}
        <section className="mb-8">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Cambiar contraseña</h3>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden space-y-0">
            {[
              { key: 'current', placeholder: 'Contraseña actual' },
              { key: 'next', placeholder: 'Nueva contraseña' },
              { key: 'confirm', placeholder: 'Confirmar nueva contraseña' },
            ].map(({ key, placeholder }, i) => (
              <div key={key} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-zinc-800' : ''}`}>
                <LockSimple size={15} weight="duotone" className="text-zinc-500 flex-shrink-0" />
                <input
                  type="password"
                  value={pwForm[key as keyof typeof pwForm]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-zinc-600"
                />
              </div>
            ))}
          </div>

          {pwMsg && (
            <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-xs ${
              pwMsg.type === 'ok' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
            }`}>
              {pwMsg.type === 'ok' ? <Check size={13} weight="bold" /> : <WarningCircle size={13} weight="duotone" />}
              {pwMsg.text}
            </div>
          )}

          <button
            onClick={changePassword}
            disabled={pwLoading}
            className="w-full mt-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors text-sm"
          >
            {pwLoading ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </section>

        {/* Account type */}
        <section className="mb-6">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Tipo de cuenta</h3>
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
                    isSelected ? 'bg-white border-white' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-black' : 'bg-zinc-800'}`}>
                    <Icon size={18} weight="duotone" className={isSelected ? 'text-white' : 'text-zinc-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-black' : 'text-white'}`}>{label}</p>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>{desc}</p>
                  </div>
                  {isSelected && <Check size={16} weight="bold" className="text-black flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <p className="text-zinc-700 text-xs mt-2 px-1">Puedes cambiar tu tipo de cuenta en cualquier momento.</p>
        </section>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="w-full border border-zinc-800 text-red-500 py-3 rounded-xl text-sm hover:bg-zinc-900 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
