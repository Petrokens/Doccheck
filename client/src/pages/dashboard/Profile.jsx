import { useEffect, useState } from 'react';
import { getUserProfile } from '@/services/authService';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getUserProfile()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  const initials = String(user?.username || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account details for the signed-in session.</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader className="flex-row items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{loading ? <Skeleton className="h-5 w-32" /> : user?.username || '—'}</CardTitle>
            <CardDescription>{loading ? <Skeleton className="mt-1 h-4 w-40" /> : user?.email || '—'}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {user?.username || '—'}</p>
          <p><span className="text-muted-foreground">Email:</span> {user?.email || '—'}</p>
          <p><span className="text-muted-foreground">Role ID:</span> {user?.role_id ?? '—'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
