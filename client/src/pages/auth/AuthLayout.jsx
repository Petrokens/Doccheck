import loginHero from '@/assets/login-hero.jpg';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/merriweather/700.css';

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen w-full" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <img
          src={loginHero}
          alt=""
          className="h-full w-full scale-110 object-cover object-[center_42%] blur-[12px]"
        />
        <div className="absolute inset-0 bg-[rgba(22,48,86,0.28)]" />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
