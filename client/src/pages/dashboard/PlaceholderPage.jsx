import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PlaceholderPage({ title, body }) {
  return (
    <div className="space-y-6 p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {body || 'This workspace is available in the QA/QC product shell.'}
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
