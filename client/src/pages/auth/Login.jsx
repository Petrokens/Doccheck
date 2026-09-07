import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-[420px] rounded-[28px] bg-white px-8 py-7 shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:px-9 sm:py-8">
        <LoginForm />
      </div>
    </AuthLayout>
  );
}
