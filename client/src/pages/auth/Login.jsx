import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';
import { Card, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-[420px] py-7 shadow-xl">
        <CardContent className="px-8 sm:px-9">
          <LoginForm />
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
