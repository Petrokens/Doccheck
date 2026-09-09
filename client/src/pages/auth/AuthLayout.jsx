import loginHero from '@/assets/login-hero.jpg';
import brandLogo from '@/assets/logo.png';
import {
  BRAND_CHECK_1,
  BRAND_CHECK_2,
  BRAND_COPYRIGHT,
  BRAND_NAME,
  BRAND_PIPELINE,
  BRAND_RULES,
  BRAND_SUBTITLE,
  BRAND_TAGLINE,
} from '@/lib/brandCopy';
import { FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react';

const PIPELINE_STEPS = BRAND_PIPELINE.split('→').map((step) => step.trim()).filter(Boolean);

const HIGHLIGHTS = [
  { icon: ShieldCheck, text: BRAND_CHECK_1 },
  { icon: FileCheck2, text: BRAND_CHECK_2 },
  { icon: LockKeyhole, text: BRAND_RULES },
];

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden font-sans text-white">
      <img
        src={loginHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
      />
      <div className="absolute inset-0 bg-[#04101c]/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#04101c]/90 via-[#04101c]/45 to-[#04101c]/15" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#04101c]/70 to-transparent" />

      <div className="relative z-10 flex min-h-screen">
        <section className="flex w-full items-center justify-center px-4 py-6 sm:px-6 lg:w-[46%] lg:max-w-[560px] lg:px-10 xl:px-12">
          <div className="auth-light-card w-full max-w-[400px] rounded-2xl border border-white/30 bg-white p-6 text-foreground shadow-[0_24px_60px_rgba(4,16,28,0.45)] sm:p-7">
            <div className="flex items-center gap-3 border-b border-border/80 pb-4">
              <img
                src={brandLogo}
                alt=""
                className="size-11 shrink-0 rounded-lg object-contain ring-1 ring-slate-200"
              />
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold tracking-wide text-foreground">{BRAND_NAME}</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {BRAND_TAGLINE}
                </p>
              </div>
            </div>

            <div className="pt-5">{children}</div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/80 pt-3.5">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <LockKeyhole className="size-3.5 shrink-0" />
                Encrypted session
              </p>
              <p className="text-right text-[11px] text-muted-foreground">{BRAND_COPYRIGHT}</p>
            </div>
          </div>
        </section>

        <aside className="hidden flex-1 flex-col justify-end px-10 pb-12 pt-16 lg:flex xl:px-16 xl:pb-16">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/90">
              Engineering document control
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold leading-tight tracking-wide text-white xl:text-5xl">
              {BRAND_SUBTITLE}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75">
              Sign in to run completeness checks, technical review, and scored QA/QC reports against your engineering
              standards.
            </p>

            <ol className="mt-8 flex flex-wrap gap-2">
              {PIPELINE_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-white backdrop-blur-sm"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-sky-400/20 text-[10px] font-bold text-sky-100">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                    <Icon className="size-4 text-sky-200" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
