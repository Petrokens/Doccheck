import { getThemeMode, roleThemeFromUser, setThemeMode } from '@/lib/theme';
import { useState } from 'react';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Settings() {
  const { user } = useSessionAuth();
  const [mode, setMode] = useState(getThemeMode());
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
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            Active palette: <span className="font-medium text-foreground">{roleLabel}</span>
          </div>
          <div>
            <Label htmlFor="theme-mode" className="mb-2 block text-sm">
              Brightness
            </Label>
            <Select
              value={mode}
              onValueChange={(value) => {
                setMode(value);
                setThemeMode(value);
              }}
            >
              <SelectTrigger id="theme-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
