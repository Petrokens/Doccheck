import loginHero from '@/assets/login-hero.jpg';
import brandLogo from '@/assets/logo.png';
import { BRAND_NAME, BRAND_PIPELINE, BRAND_SUBTITLE, BRAND_TAGLINE } from '@/lib/brandCopy';

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full font-sans">
      {/* Left — login / auth form */}
      <section className="relative z-10 flex w-full flex-col justify-center bg-background px-6 py-10 sm:px-10 lg:w-[46%] lg:max-w-[560px] lg:px-14 xl:px-16">
        <div className="mx-auto w-full max-w-[400px]">{children}</div>
      </section>

      {/* Right — full-bleed industrial image */}
      <aside className="relative hidden flex-1 overflow-hidden lg:block">
        <img
          src={loginHero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
        />
        {/* Soft bottom fade only — keep the photo clear */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#04101c]/70 via-[#04101c]/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-12">
          <div className="max-w-xl rounded-2xl border border-white/20 bg-[#04101c]/82 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm xl:p-8">
            <div className="flex items-center gap-4">
              <img
                src={brandLogo}
                alt=""
                className="size-20 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm ring-1 ring-white/40"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  {BRAND_NAME}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-white/90">
                  {BRAND_TAGLINE}
                </p>
              </div>
            </div>
            <p className="mt-5 text-2xl font-semibold leading-snug tracking-wide text-white xl:text-3xl">
              {BRAND_SUBTITLE}
            </p>
            <p className="mt-3 text-sm font-medium tracking-wide text-sky-200/95">
              {BRAND_PIPELINE}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
