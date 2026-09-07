import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocumentImageReaderSection({ mainDocument, logs }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!mainDocument) {
      setPreviewUrl(null);
      return undefined;
    }
    const isImage = /\.(png|jpe?g|webp|tif|tiff)$/i.test(mainDocument.name || '');
    if (!isImage) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(mainDocument);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mainDocument]);

  if (!mainDocument) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document reader</CardTitle>
        <CardDescription>
          {mainDocument.name} · {(mainDocument.size / (1024 * 1024)).toFixed(2)} MB
        </CardDescription>
      </CardHeader>
      <CardContent>
        {previewUrl ? (
          <img src={previewUrl} alt="Uploaded document preview" className="max-h-80 rounded-lg border object-contain" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Server OCR extracts text from PDFs, Word, and scans during QA/QC analysis.
          </p>
        )}
        {logs?.length ? (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{logs[logs.length - 1]}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
