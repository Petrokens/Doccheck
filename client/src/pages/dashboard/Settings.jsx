import { getThemeMode, setThemeMode } from '@/lib/theme';
import { useState } from 'react';
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
  const [mode, setMode] = useState(getThemeMode());
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Appearance for this browser session.</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Light, dark, or follow the system preference.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="theme-mode" className="sr-only">Theme</Label>
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
        </CardContent>
      </Card>
    </div>
  );
}
