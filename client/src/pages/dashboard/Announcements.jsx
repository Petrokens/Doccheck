import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Megaphone, Plus, RefreshCw, Send } from 'lucide-react';
import { publicApiError } from '@/lib/uploadSafety';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { listRoles } from '@/services/adminService';
import { createAnnouncement, listAnnouncements } from '@/services/announcementService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function Announcements() {
  const { user } = useSessionAuth();
  const isMaster = Number(user?.role_id) === 1;
  const [items, setItems] = useState([]);
  const [canCompose, setCanCompose] = useState(isMaster);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', role_ids: [] });

  const load = () => {
    setLoading(true);
    const requests = [listAnnouncements()];
    if (isMaster) requests.push(listRoles().catch(() => []));
    Promise.all(requests)
      .then(([data, nextRoles]) => {
        setItems(data.announcements || []);
        setCanCompose(Boolean(data.can_compose));
        if (Array.isArray(nextRoles)) setRoles(nextRoles);
      })
      .catch((err) => toast.error(publicApiError(err, 'Unable to load announcements')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCompose = () => {
    setForm({
      title: '',
      body: '',
      role_ids: roles.map((role) => Number(role.id)),
    });
    setOpen(true);
  };

  const toggleRole = (id) => {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(id)
        ? prev.role_ids.filter((value) => value !== id)
        : [...prev.role_ids, id],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createAnnouncement(form);
      toast.success('Announcement posted.');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(publicApiError(err, 'Could not send announcement'));
    } finally {
      setSaving(false);
    }
  };

  const empty = useMemo(() => !loading && !items.length, [loading, items.length]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace · Notices</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">Announcements</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {canCompose
              ? 'Post a notice for users in the roles you select.'
              : 'Notices for your role appear here.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
          {canCompose ? (
            <Button type="button" size="sm" onClick={openCompose} disabled={loading}>
              <Plus /> New announcement
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading announcements…</p>
      ) : empty ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="size-5" /> No announcements yet
            </CardTitle>
            <CardDescription>
              {canCompose
                ? 'Create a notice and choose which roles should see it.'
                : 'When a Master Admin sends a notice to your role, it will show up here.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className="flex flex-wrap gap-1">
                    {(item.role_names || []).map((name) => (
                      <Badge key={name} variant="secondary">{name}</Badge>
                    ))}
                  </div>
                </div>
                <CardDescription>
                  {item.created_by_name || 'Master Admin'}
                  {item.created_at ? ` · ${formatWhen(item.created_at)}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-6">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
        <DialogContent className="max-w-lg">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Send announcement</DialogTitle>
              <DialogDescription>
                The message is saved in the app for every user in the selected roles.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="announcement-body">Message</Label>
                <Textarea
                  id="announcement-body"
                  required
                  rows={6}
                  value={form.body}
                  onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Show to these roles</Label>
                <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.role_ids.includes(Number(role.id))}
                        onCheckedChange={() => toggleRole(Number(role.id))}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.role_ids.length}>
                <Send /> {saving ? 'Posting…' : 'Post announcement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
