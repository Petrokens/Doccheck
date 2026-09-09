import { roleThemeFromUser } from '@/lib/theme';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Settings() {
  const { user } = useSessionAuth();
  const roleTheme = roleThemeFromUser(user);
  const roleLabel = roleTheme === 'master' ? 'Master Admin (teal light)' : 'User / Engineer (sky light)';

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Appearance for this browser session.</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Light surfaces are the default. Cards, buttons, inputs, and tables follow your role palette automatically: {roleLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            Active palette: <span className="font-medium text-foreground">{roleLabel}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
