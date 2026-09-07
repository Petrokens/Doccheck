import LoginForm from './LoginForm';
import loginBackground from '@/assets/loginbg.png';
import logo from '@/assets/logo.png';
import { Bolt, LockKeyhole, ShieldCheck, Users } from 'lucide-react';

const featureItems = [
  { icon: ShieldCheck, title: 'Accurate & Reliable', description: 'AI-driven precision for engineering document verification.' },
  { icon: Bolt, title: 'Faster Workflows', description: 'Automate QA/QC review and save valuable time.' },
  { icon: LockKeyhole, title: 'Secure & Compliant', description: 'Role-based access and audit-ready reports.' },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#f3f5fb]">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative min-h-[56vh] overflow-hidden p-4 text-white sm:p-6 lg:min-h-screen lg:p-8">
          <img src={loginBackground} alt="" className="absolute inset-0 h-full w-full object-cover object-[33%_center]" />
          <div className="absolute inset-0 bg-[#031335]/60" />
          <div className="relative z-10 flex h-full flex-col">
            <img src={logo} alt="Petrolenz QA/QC" className="h-[62px] w-fit brightness-0 invert sm:h-[70px]" />
            <span className="mt-4 inline-flex w-fit rounded-full bg-[#13336f]/80 px-4 py-1.5 text-[10px] font-medium tracking-wide">
              AI-POWERED QUALITY ASSURANCE
            </span>
            <h1 className="mt-5 max-w-[560px] text-[34px] font-semibold leading-[1.15] sm:text-[50px]">
              Engineering Documents.
              <br />
              <span className="text-[#64a3ff]">Verified by AI.</span> Trusted by Experts.
            </h1>
            <p className="mt-5 max-w-[540px] text-sm text-white/85 sm:text-[24px] sm:leading-[1.35]">
              Petrolenz QA/QC ensures accuracy, compliance, and excellence in every engineering document.
            </p>
            <div className="mt-7 space-y-3.5">
              {featureItems.map((item) => (
                <div key={item.title} className="flex max-w-[450px] items-start gap-3 rounded-2xl bg-[#0f2f73]/75 p-3.5">
                  <span className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b3f89]/95">
                    <item.icon className="h-5 w-5 text-[#8ec2ff]" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{item.title}</h3>
                    <p className="mt-1 text-[13px] text-white/80">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-3 pt-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f2f73]/70">
                <Users className="h-5 w-5 text-[#9ec9ff]" />
              </span>
              <p className="text-[13px] font-medium">Engineering QA/QC for EPC deliverables</p>
            </div>
          </div>
        </section>
        <section className="flex min-h-[44vh] items-center justify-center p-5 sm:p-8 lg:min-h-screen">
          <div className="w-full max-w-[560px] rounded-[24px] bg-[#f8f9fd] px-2 pb-4 pt-2 shadow-[0_18px_55px_rgba(15,23,42,0.10)] sm:px-9 sm:py-4">
            <LoginForm />
          </div>
        </section>
      </div>
    </div>
  );
}
