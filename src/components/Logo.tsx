const LOGO_IMG = '/ChatGPT_Image_5_jul_2026,_12_59_59_a.m._(1).png';

export function Logo({ size = 'md', variant = 'light' }: { size?: 'sm' | 'md' | 'lg'; variant?: 'light' | 'dark' }) {
  const px = { sm: 28, md: 36, lg: 48 }[size];
  const titleSize = { sm: 'text-base', md: 'text-lg', lg: 'text-xl' };
  const subSize = { sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-[10px]' };
  return (
    <div className="flex items-center gap-2">
      <img src={LOGO_IMG} alt="FisioMirror" style={{ width: px, height: px, objectFit: 'contain' }} className="shrink-0" />
      <div className="leading-tight">
        <p className={`${titleSize[size]} font-bold ${variant === 'dark' ? 'text-white' : 'text-primary'}`}>FisioMirror</p>
        <p className={`${subSize[size]} uppercase tracking-widest ${variant === 'dark' ? 'text-white/60' : 'text-outline'}`}>
          {variant === 'dark' ? 'Rehabilitación Inteligente' : 'Optimismo Terapéutico'}
        </p>
      </div>
    </div>
  );
}
