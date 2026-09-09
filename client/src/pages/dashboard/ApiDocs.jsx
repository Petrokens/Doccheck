import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Loader2, Play, Search, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { getAccessToken } from '@/lib/axios';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const METHOD_STYLES = {
  get: 'bg-secondary text-secondary-foreground',
  post: 'bg-primary/15 text-primary',
  put: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  patch: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  delete: 'bg-destructive/10 text-destructive',
};

function swaggerUiUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, '/api/docs');
}

function operationsFromSpec(spec) {
  const list = [];
  for (const [path, methods] of Object.entries(spec?.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (!HTTP_METHODS.has(method) || !op || typeof op !== 'object') continue;
      list.push({
        id: op.operationId || `${method}:${path}`,
        method: method.toLowerCase(),
        path,
        summary: op.summary || op.operationId,
        description: op.description || '',
        tags: op.tags || ['Other'],
        security: op.security,
        parameters: op.parameters || [],
        requestBody: op.requestBody,
        responses: op.responses || {},
      });
    }
  }
  return list;
}

function schemaExample(schema, spec) {
  if (!schema) return '';
  if (schema.example !== undefined) return JSON.stringify(schema.example, null, 2);
  const ref = schema.$ref;
  if (ref) {
    const name = String(ref).split('/').pop();
    const resolved = spec?.components?.schemas?.[name];
    if (resolved?.example) return JSON.stringify(resolved.example, null, 2);
    if (resolved?.properties) {
      const obj = {};
      for (const [key, value] of Object.entries(resolved.properties)) {
        obj[key] = value.example ?? value.type ?? '';
      }
      return JSON.stringify(obj, null, 2);
    }
  }
  if (schema.properties) {
    const obj = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      obj[key] = value.example ?? value.type ?? '';
    }
    return JSON.stringify(obj, null, 2);
  }
  return '';
}

function isMultipart(op) {
  return Boolean(op.requestBody?.content?.['multipart/form-data']);
}

function jsonBodySchema(op) {
  return op.requestBody?.content?.['application/json']?.schema;
}

function jsonBodyExample(op, spec) {
  const media = op.requestBody?.content?.['application/json'];
  if (media?.example) return JSON.stringify(media.example, null, 2);
  return schemaExample(jsonBodySchema(op), spec);
}

function resolveParam(param, spec) {
  if (!param?.$ref) return param;
  const name = String(param.$ref).split('/').pop();
  return spec?.components?.parameters?.[name] || param;
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

function statusColor(status) {
  const code = Number(status);
  if (code >= 200 && code < 300) return 'text-emerald-700 dark:text-emerald-300';
  if (code >= 400) return 'text-rose-700 dark:text-rose-300';
  return 'text-primary';
}

export default function ApiDocs() {
  const [spec, setSpec] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState('');
  const [pathValues, setPathValues] = useState({});
  const [queryValues, setQueryValues] = useState({});
  const [bodyText, setBodyText] = useState('');
  const [files, setFiles] = useState({ mainDocument: [], supportDocument: [] });
  const [formFields, setFormFields] = useState({ documentType: '', reportCategory: '' });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/docs.json`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'API docs are disabled on this server.' : 'Unable to load OpenAPI spec.');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSpec(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load API docs.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const operations = useMemo(() => operationsFromSpec(spec), [spec]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operations;
    return operations.filter((op) =>
      [op.method, op.path, op.summary, op.description, ...(op.tags || [])].join(' ').toLowerCase().includes(q),
    );
  }, [operations, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const op of filtered) {
      const tag = op.tags[0] || 'Other';
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag).push(op);
    }
    return [...map.entries()];
  }, [filtered]);

  function toggle(op) {
    const next = openId === op.id ? '' : op.id;
    setOpenId(next);
    setResult(null);
    if (next) {
      setBodyText(jsonBodyExample(op, spec));
      setPathValues({});
      setQueryValues({});
      setFiles({ mainDocument: [], supportDocument: [] });
      setFormFields({ documentType: '', reportCategory: '' });
    }
  }

  async function run(op) {
    setRunning(true);
    setResult(null);
    try {
      let urlPath = op.path;
      const resolvedParams = op.parameters.map((p) => resolveParam(p, spec)).filter(Boolean);
      for (const param of resolvedParams.filter((p) => p.in === 'path')) {
        const value = encodeURIComponent(pathValues[param.name] || '');
        urlPath = urlPath.replace(`{${param.name}}`, value);
      }
      const search = new URLSearchParams();
      for (const param of resolvedParams.filter((p) => p.in === 'query')) {
        const value = queryValues[param.name];
        if (value) search.set(param.name, value);
      }
      const origin = spec?.servers?.[0]?.url || API_BASE_URL.replace(/\/api\/?$/, '');
      const url = `${origin}${urlPath}${search.toString() ? `?${search}` : ''}`;
      const headers = { 'X-Requested-With': 'DocCheck' };
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const init = { method: op.method.toUpperCase(), headers, credentials: 'include' };
      if (['post', 'put', 'patch'].includes(op.method)) {
        if (isMultipart(op)) {
          const form = new FormData();
          if (formFields.documentType) form.append('documentType', formFields.documentType);
          if (formFields.reportCategory) form.append('reportCategory', formFields.reportCategory);
          for (const file of files.mainDocument) form.append('mainDocument', file);
          for (const file of files.supportDocument) form.append('supportDocument', file);
          init.body = form;
        } else if (bodyText.trim()) {
          headers['Content-Type'] = 'application/json';
          init.body = bodyText;
        }
      }

      const res = await fetch(url, init);
      const contentType = res.headers.get('content-type') || '';
      let body = '';
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        body = `PDF received (${blob.size} bytes). Open: ${objectUrl}`;
      } else {
        body = await res.text();
        try {
          body = JSON.stringify(JSON.parse(body), null, 2);
        } catch {
          /* keep text */
        }
      }
      setResult({ status: res.status, statusText: res.statusText, body });
    } catch (err) {
      setResult({ status: 0, statusText: 'Network error', body: err.message || String(err) });
    } finally {
      setRunning(false);
    }
  }

  const tokenPresent = Boolean(getAccessToken());

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">API documentation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every backend route, with request shapes and a live Try it panel using your current session.
          </p>
        </div>
        <Button asChild>
          <a href={swaggerUiUrl()} target="_blank" rel="noreferrer">
            <BookOpen />
            Open Swagger UI
            <ExternalLink />
          </a>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search method, path, or tag"
            className="pl-8"
          />
        </div>
        <Badge variant={tokenPresent ? 'secondary' : 'outline'}>
          <ShieldCheck />
          {tokenPresent ? 'Session token attached to Try it' : 'Login first for protected routes'}
        </Badge>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !spec ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading OpenAPI spec…
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([tag, ops]) => (
            <section key={tag}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{tag}</h2>
              <div className="space-y-2">
                {ops.map((op) => {
                  const expanded = openId === op.id;
                  const resolvedParams = op.parameters.map((p) => resolveParam(p, spec)).filter(Boolean);
                  const pathParams = resolvedParams.filter((p) => p.in === 'path');
                  const queryParams = resolvedParams.filter((p) => p.in === 'query');
                  return (
                    <Card key={op.id} className="overflow-hidden py-0">
                      <button
                        type="button"
                        onClick={() => toggle(op)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span className={`w-16 rounded-md px-2 py-0.5 text-center text-[11px] font-bold uppercase ${METHOD_STYLES[op.method] || METHOD_STYLES.get}`}>
                          {op.method}
                        </span>
                        <code className="text-sm font-semibold">{op.path}</code>
                        <span className="hidden text-sm text-muted-foreground sm:inline">{op.summary}</span>
                      </button>
                      {expanded && (
                        <CardContent className="space-y-4 border-t py-4">
                          {op.description ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{op.description}</p> : null}
                          {pathParams.map((param) => (
                            <div key={param.name} className="space-y-1.5">
                              <Label>{param.name} (path)</Label>
                              <Input
                                value={pathValues[param.name] || ''}
                                onChange={(e) => setPathValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                                placeholder={param.schema?.example || param.name}
                              />
                            </div>
                          ))}
                          {queryParams.map((param) => (
                            <div key={param.name} className="space-y-1.5">
                              <Label>{param.name} (query)</Label>
                              <Input
                                value={queryValues[param.name] || ''}
                                onChange={(e) => setQueryValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                                placeholder={String(param.schema?.default ?? '')}
                              />
                            </div>
                          ))}
                          {isMultipart(op) ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label>Document type</Label>
                                <Input
                                  value={formFields.documentType}
                                  onChange={(e) => setFormFields((prev) => ({ ...prev, documentType: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Report category</Label>
                                <Input
                                  value={formFields.reportCategory}
                                  onChange={(e) => setFormFields((prev) => ({ ...prev, reportCategory: e.target.value }))}
                                  placeholder="process"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Main documents</Label>
                                <Input
                                  type="file"
                                  multiple
                                  onChange={(e) => setFiles((prev) => ({ ...prev, mainDocument: [...e.target.files] }))}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Support documents</Label>
                                <Input
                                  type="file"
                                  multiple
                                  onChange={(e) => setFiles((prev) => ({ ...prev, supportDocument: [...e.target.files] }))}
                                />
                              </div>
                            </div>
                          ) : jsonBodySchema(op) || op.requestBody ? (
                            <div className="space-y-1.5">
                              <Label>Request body</Label>
                              <Textarea
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                                rows={8}
                                className="font-mono text-xs"
                              />
                            </div>
                          ) : null}
                          <Button type="button" onClick={() => run(op)} disabled={running}>
                            {running ? <Loader2 className="animate-spin" /> : <Play />}
                            Try it
                          </Button>
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Responses</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(op.responses).map(([code, resp]) => (
                                <Badge key={code} variant="secondary">
                                  {code} {resp.description}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {result && (
                            <pre className="max-h-80 overflow-auto rounded-xl bg-foreground p-3 text-xs text-background">
                              <span className={statusColor(result.status)}>
                                {result.status} {result.statusText}
                              </span>
                              {'\n'}
                              {result.body}
                            </pre>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
