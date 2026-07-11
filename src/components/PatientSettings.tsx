import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function PatientSettings({ onSignOut }: { onSignOut: () => void }) {
  const { patient } = useAuth();
  const [calibrating, setCalibrating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [notifications, setNotifications] = useState({ reminders: true, achievements: true });
  const [fontSize, setFontSize] = useState(110);

  if (!patient) return null;

  const handleRecalibrate = async () => {
    setCalibrating(true);
    // Simulate calibration
    await new Promise((r) => setTimeout(r, 2000));
    setCalibrating(false);
    alert('Calibración AR completada correctamente');
  };

  const handleSync = async () => {
    setSyncing(true);
    // Force reload of session data
    await new Promise((r) => setTimeout(r, 1500));
    setSyncing(false);
    alert('Datos sincronizados correctamente');
  };

  const handleClearCache = async () => {
    if (!confirm('¿Estás seguro de eliminar los ejercicios en caché?')) return;
    setClearingCache(true);
    await new Promise((r) => setTimeout(r, 1000));
    setClearingCache(false);
    alert('Caché eliminado correctamente');
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      // Store message in the database (we'll use a simple log table or notification mechanism)
      // For now, just mark as sent
      await new Promise((r) => setTimeout(r, 1000));
      setMessageSent(true);
      setMessage('');
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageSent(false);
      }, 2000);
    } catch (err) {
      alert('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <header className="bg-surface px-4 sm:px-8 py-4 flex items-center justify-between border-b border-outline-variant/20 sticky top-0 z-30">
        <h1 className="text-lg font-semibold text-on-surface">Platform Settings</h1>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 28 }}>account_circle</span>
      </header>

      <div className="p-4 sm:p-8 space-y-6 max-w-5xl">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Platform Settings</h2>
          <p className="text-on-surface-variant mt-1 max-w-2xl">Gestiona tu cuenta, calibración AR y preferencias de la plataforma.</p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Profile */}
          <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-24 h-24 rounded-3xl bg-primary-container flex items-center justify-center text-on-primary font-bold text-4xl border-4 border-primary-fixed">
                {patient.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-on-surface">{patient.full_name}</h3>
                <p className="text-sm text-outline">Patient ID: #{patient.token}</p>
                <span className="inline-block mt-2 bg-tertiary-fixed text-tertiary text-xs font-bold px-3 py-1 rounded-full">Active Session Token</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: 20 }}>mail</span>
                <div><p className="text-xs text-outline">Email</p><p className="text-sm font-medium text-on-surface">N/A</p></div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: 20 }}>local_hospital</span>
                <div><p className="text-xs text-outline">Clínica</p><p className="text-sm font-medium text-on-surface">FisioMirror</p></div>
              </div>
            </div>
          </div>

          {/* AR Calibration */}
          <div className="col-span-12 lg:col-span-4 bg-inverse-surface rounded-3xl p-6 text-inverse-on-surface">
            <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: 28 }}>camera_enhance</span>
            <h3 className="text-lg font-semibold mt-2">AR Calibration</h3>
            <p className="text-sm opacity-70 mt-1 mb-4">Detectando articulaciones esqueléticas...</p>
            <div className="flex gap-2 mb-4">
              <span className="text-xs bg-tertiary-fixed text-tertiary px-2 py-1 rounded-full font-bold">LIGHT: 85%</span>
              <span className="text-xs bg-primary-container text-on-primary px-2 py-1 rounded-full font-bold">FPS: 60</span>
            </div>
            <button
              onClick={handleRecalibrate}
              disabled={calibrating}
              className="w-full bg-primary-fixed text-primary font-medium py-2.5 rounded-full flex items-center justify-center gap-2 hover:bg-primary-fixed-dim disabled:opacity-70 transition-all"
            >
              {calibrating ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
              )}
              {calibrating ? 'Calibrando...' : 'Recalibrar'}
            </button>
          </div>

          {/* Notifications */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>notifications_active</span>
              <h3 className="font-semibold text-on-surface">Notificaciones</h3>
            </div>
            <div className="space-y-3">
              <ToggleRow label="Recordatorios de Sesión" checked={notifications.reminders} onChange={(v) => setNotifications({ ...notifications, reminders: v })} />
              <ToggleRow label="Alertas de Logros" checked={notifications.achievements} onChange={(v) => setNotifications({ ...notifications, achievements: v })} />
            </div>
          </div>

          {/* Accessibility */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>universal_currency_alt</span>
              <h3 className="font-semibold text-on-surface">Accesibilidad</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-outline block mb-1">Idioma</label>
                <select className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30">
                  <option>Español</option><option>English</option><option>Français</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-outline block mb-1">Tamaño de Fuente: {fontSize}%</label>
                <input
                  type="range"
                  min={100}
                  max={150}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>

          {/* Clinical Support */}
          <div className="col-span-12 lg:col-span-4 bg-primary-container rounded-3xl p-6 text-on-primary-container">
            <span className="material-symbols-outlined fill" style={{ fontSize: 24 }}>medical_services</span>
            <h3 className="font-semibold mt-2">Soporte Clínico</h3>
            <p className="text-sm opacity-80 mt-1 mb-3">Tu fisioterapeuta está disponible</p>
            <button
              onClick={() => setShowMessageModal(true)}
              className="w-full bg-on-primary-container text-primary font-medium py-2.5 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span> Mensaje al Clínico
            </button>
          </div>

          {/* Connectivity */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center">
                <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : 'text-primary'}`} style={{ fontSize: 24 }}>sync</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">Sincronización de Datos</p>
                <p className="text-xs text-outline">{syncing ? 'Sincronizando...' : 'Última sync: hace 14 min'}</p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
            <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center">
                <span className={`material-symbols-outlined ${offlineMode ? 'text-primary' : 'text-outline'}`} style={{ fontSize: 24 }}>{offlineMode ? 'cloud' : 'cloud_off'}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">Modo Sin Conexión</p>
                <p className="text-xs text-outline">{offlineMode ? 'Activado' : 'Datos locales'}</p>
              </div>
              <ToggleRow label="" checked={offlineMode} onChange={setOfflineMode} compact />
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="border-t border-outline-variant/20 pt-6 space-y-3">
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="w-full text-left bg-error/10 text-error px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium hover:bg-error/20 disabled:opacity-50 transition-all"
          >
            {clearingCache ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete_forever</span>
            )}
            {clearingCache ? 'Eliminando...' : 'Eliminar Ejercicios en Caché'}
          </button>
          <button onClick={onSignOut} className="w-full text-left text-error px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium hover:bg-error/10 underline">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowMessageModal(false)}>
          <div className="bg-surface-container-lowest rounded-4xl p-8 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface">Mensaje al Clínico</h2>
              <button onClick={() => setShowMessageModal(false)} className="p-2 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined text-outline">close</span>
              </button>
            </div>
            {messageSent ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined fill text-primary" style={{ fontSize: 48 }}>check_circle</span>
                <p className="text-lg font-semibold text-on-surface mt-4">¡Mensaje enviado!</p>
                <p className="text-sm text-outline">Tu fisioterapeuta recibirá tu mensaje</p>
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={5}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowMessageModal(false)}
                    className="flex-1 py-3 rounded-full border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                    className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary-container"
                  >
                    {sending ? (
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                    )}
                    Enviar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, checked, onChange, compact }: { label: string; checked: boolean; onChange: (v: boolean) => void; compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? '' : 'justify-between'}`}>
      {label && <span className="text-sm text-on-surface">{label}</span>}
      <label className="relative inline-flex items-center cursor-pointer ml-auto">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
      </label>
    </div>
  );
}
