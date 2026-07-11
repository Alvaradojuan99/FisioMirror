import { ReactNode, useEffect, useState } from 'react';

export type FisioView = 'dashboard' | 'pacientes' | 'puente' | 'library' | 'asistente' | 'configuracion';

interface Props {
  children: ReactNode;
  current: FisioView;
  onNavigate: (v: FisioView) => void;
  onSignOut: () => void;
  fisioName: string;
}

const navItems: { key: FisioView; label: string; icon: string; color: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', color: 'from-emerald-500 to-teal-600' },
  { key: 'pacientes', label: 'Pacientes', icon: 'person', color: 'from-blue-500 to-indigo-600' },
  { key: 'puente', label: 'Puente de Acceso', icon: 'sync', color: 'from-amber-500 to-orange-600' },
  { key: 'library', label: 'Library', icon: 'local_library', color: 'from-purple-500 to-pink-600' },
  { key: 'asistente', label: 'Asistente IA', icon: 'smart_toy', color: 'from-teal-500 to-cyan-600' },
  { key: 'configuracion', label: 'Configuración', icon: 'settings', color: 'from-gray-500 to-slate-600' },
];

export function FisioLayout({ children, current, onNavigate, onSignOut, fisioName }: Props) {
  const [isHovered, setIsHovered] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Background pattern */}
      <div className="fixed inset-0 pattern-grid opacity-30 pointer-events-none" />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 z-40">
        <div className="h-full glass-card rounded-none rounded-r-3xl border-l-0 flex flex-col relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

          {/* Decorative shapes */}
          <div className="absolute top-20 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-40 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-pulse-soft" style={{ animationDelay: '1s' }} />

          {/* Brand */}
          <div className="relative p-4 border-b border-outline-variant/10 flex justify-center">
            <img
              src="/ChatGPT_Image_5_jul_2026,_12_59_59_a.m._(1).png"
              alt="FisioMirror"
              className="w-36 h-36 object-contain"
            />
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-2 relative overflow-y-auto">
            {navItems.map((item, index) => {
              const active = current === item.key;
              const hovered = isHovered === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  onMouseEnter={() => setIsHovered(item.key)}
                  onMouseLeave={() => setIsHovered(null)}
                  className={`relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group animate-fade-in-up ${
                    active
                      ? 'bg-white shadow-lg shadow-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-white/50 hover:text-on-surface'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
                >
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 gradient-primary rounded-r-full" />
                  )}

                  {/* Hover glow */}
                  {hovered && !active && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-5 rounded-2xl transition-opacity`} />
                  )}

                  {/* Icon container */}
                  <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    active
                      ? `bg-gradient-to-br ${item.color} text-white shadow-lg`
                      : `bg-surface-container group-hover:bg-gradient-to-br group-hover:from-primary/10 group-hover:to-secondary/10`
                  }`}>
                    <span
                      className={`material-symbols-outlined transition-all duration-300 ${
                        active ? 'fill text-white' : 'text-on-surface-variant group-hover:text-primary'
                      }`}
                      style={{ fontSize: 22 }}
                    >
                      {item.icon}
                    </span>

                    {/* Icon glow on active */}
                    {active && (
                      <div className="absolute inset-0 rounded-xl opacity-50 animate-ping">
                        <div className={`w-full h-full bg-gradient-to-br ${item.color} rounded-xl`} />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <span className={`transition-all duration-300 ${active ? 'translate-x-1' : ''}`}>
                    {item.label}
                  </span>

                  {/* Arrow on active */}
                  {active && (
                    <span className="material-symbols-outlined ml-auto text-primary animate-fade-in" style={{ fontSize: 18 }}>
                      chevron_right
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User card */}
          <div className="p-4 border-t border-outline-variant/10 relative">
            <div className="relative flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl border border-white/50 shadow-sm">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {fisioName.charAt(0).toUpperCase()}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse-soft" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-surface truncate">{fisioName}</p>
                <p className="text-xs text-outline flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                  Fisioterapeuta
                </p>
              </div>
            </div>

            {/* Sign out button */}
            <button
              onClick={onSignOut}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-outline hover:bg-error/10 hover:text-error transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-error/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-xl" />
              <span className="material-symbols-outlined relative z-10" style={{ fontSize: 20 }}>logout</span>
              <span className="relative z-10">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 ml-72 min-h-screen relative">
        {/* Subtle gradient overlay */}
        <div className="fixed inset-0 ml-72 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        {/* Page content */}
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
