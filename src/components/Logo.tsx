export function Logo({ size = 'md', variant = 'light' }: { size?: 'sm' | 'md' | 'lg'; variant?: 'light' | 'dark' }) {
  const titleSize = { sm: 'text-base', md: 'text-lg', lg: 'text-xl' };
  const subSize = { sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-[10px]' };
  const titleColor = variant === 'dark' ? 'text-white' : 'text-primary';
  return (
    <div className="flex items-center gap-2">
      <span className={`material-symbols-outlined fill ${titleColor}`} style={{ fontSize: size === 'lg' ? 32 : size === 'sm' ? 24 : 28 }}>
        monitor_heart
      </span>
      <div className="leading-tight">
        <p className={`${titleSize} font-bold ${titleColor}`}>FisioMirror</p>
        <p className={`${subSize} uppercase tracking-widest ${variant === 'dark' ? 'text-white/60' : 'text-outline'}`}>
          {variant === 'dark' ? 'Rehabilitación Inteligente' : 'Optimismo Terapéutico'}
        </p>
      </div>
    </div>
  );
}
