import { useAuth } from '../lib/auth';

export function FisioSettings({ onSignOut }: { onSignOut: () => void }) {
  const { fisio } = useAuth();
  if (!fisio) return null;

  return (
    <div>
      <header className="bg-surface px-8 py-4 flex items-center gap-4 border-b border-outline-variant/20">
        <h1 className="text-lg font-semibold text-on-surface">Configuración</h1>
      </header>

      <div className="p-8 max-w-2xl">
        <div className="bg-surface-container-lowest rounded-4xl p-6 border border-outline-variant/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary font-bold text-2xl">
              {fisio.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-on-surface">{fisio.full_name}</p>
              <p className="text-sm text-outline">Fisioterapeuta</p>
            </div>
          </div>

          <div className="space-y-3">
            <InfoRow icon="person" label="Nombre Completo" value={fisio.full_name} />
            <InfoRow icon="mail" label="Correo Electrónico" value={fisio.email} />
            <InfoRow icon="school" label="Universidad de Egreso" value={fisio.university} />
            <InfoRow icon="medical_services" label="Rol" value="Fisioterapeuta Certificado" />
          </div>

          <div className="mt-6 pt-6 border-t border-outline-variant/20">
            <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 rounded-full bg-error/10 text-error px-5 py-3 text-sm font-semibold hover:bg-error/20 transition-all">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
      <div className="w-9 h-9 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center text-outline shrink-0">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-outline">{label}</p>
        <p className="text-sm font-medium text-on-surface truncate">{value}</p>
      </div>
    </div>
  );
}
