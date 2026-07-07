import { ReactNode, useState } from 'react';

export type PatientView = 'dashboard' | 'sesiones' | 'progreso' | 'ajustes';

interface Props {
  children: ReactNode;
  current: PatientView;
  onNavigate: (v: PatientView) => void;
  onSignOut: () => void;
  patientName: string;
}

const navItems: { key: PatientView; label: string; icon: string; gradient: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', gradient: 'from-emerald-500 to-teal-600' },
  { key: 'sesiones', label: 'Sesiones', icon: 'play_circle', gradient: 'from-blue-500 to-indigo-600' },
  { key: 'progreso', label: 'Progreso', icon: 'trending_up', gradient: 'from-amber-500 to-orange-600' },
  { key: 'ajustes', label: 'Ajustes', icon: 'settings', gradient: 'from-gray-500 to-slate-600' },
];

export function PatientLayout({ children, current, onNavigate, onSignOut }: Props) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Background pattern */}
      <div className="fixed inset-0 pattern-grid opacity-20 pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 hidden lg:flex flex-col z-40">
        <div className="h-full glass-card rounded-none rounded-r-3xl border-l-0 flex flex-col relative overflow-hidden">
          {/* Animated gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

          {/* Decorative shapes */}
          <div className="absolute top-32 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-60 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '-2s' }} />

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
              const hovered = hoveredItem === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  onMouseEnter={() => setHoveredItem(item.key)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group animate-fade-in-up ${
                    active
                      ? 'bg-white shadow-lg shadow-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-white/50 hover:text-on-surface'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 gradient-primary rounded-r-full" />
                  )}

                  {hovered && !active && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-5 rounded-2xl`} />
                  )}

                  <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    active
                      ? `bg-gradient-to-br ${item.gradient} text-white shadow-lg`
                      : 'bg-surface-container group-hover:scale-110'
                  }`}>
                    <span
                      className={`material-symbols-outlined transition-colors ${
                        active ? 'fill text-white' : 'text-on-surface-variant group-hover:text-primary'
                      }`}
                      style={{ fontSize: 24 }}
                    >
                      {item.icon}
                    </span>
                  </div>

                  <span className={active ? 'translate-x-1' : ''}>{item.label}</span>

                  {active && (
                    <span className="material-symbols-outlined ml-auto text-primary" style={{ fontSize: 18 }}>
                      chevron_right
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-outline-variant/10 space-y-3">
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help</span>
              Centro de Ayuda
            </button>

            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-outline hover:bg-error/10 hover:text-error transition-all duration-300 group"
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 20 }}>logout</span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-72 min-h-screen pb-24 lg:pb-0 relative">
        {/* Gradient overlays */}
        <div className="fixed inset-0 lg:left-72 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="glass-card rounded-t-3xl border-t-0 border-l-0 border-r-0">
          <div className="flex justify-around items-center py-3 px-4">
            {navItems.map((item) => {
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                    active ? 'scale-110' : 'hover:scale-105'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    active
                      ? `bg-gradient-to-br ${item.gradient} text-white shadow-lg`
                      : 'bg-surface-container text-outline'
                  }`}>
                    <span
                      className={`material-symbols-outlined ${active ? 'fill' : ''}`}
                      style={{ fontSize: 26 }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold ${active ? 'text-primary' : 'text-outline'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Safe area for iPhone */}
          <div className="h-safe-area-inset-bottom" />
        </div>
      </nav>
    </div>
  );
}
