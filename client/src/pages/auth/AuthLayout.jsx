import loginHero from '@/assets/login-hero.jpg';

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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a2540]/85%] via-[#0a2540]/35%] to-[#0a2540]/15%" />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
            Oil &amp; Gas Engineering QC
          </p>
          <p className="mt-3 max-w-md text-2xl font-semibold leading-snug tracking-wide text-white xl:text-3xl">
            AI QC for engineering documents. Faster reviews, clearer assurance.
          </p>
        </div>
      </aside>
    </div>
  );
}
