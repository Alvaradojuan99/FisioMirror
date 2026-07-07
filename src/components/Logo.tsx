const LOGO_IMG = '/ChatGPT_Image_5_jul_2026,_12_59_59_a.m._(1).png';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg'; variant?: 'light' | 'dark' }) {
  const px = { sm: 40, md: 56, lg: 80 }[size];
  return (
    <img src={LOGO_IMG} alt="FisioMirror" style={{ width: px, height: px, objectFit: 'contain' }} className="shrink-0" />
  );
}
