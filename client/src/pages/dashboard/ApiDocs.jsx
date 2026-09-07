import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Loader2, Play, Search, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { getAccessToken } from '@/lib/axios';

const METHOD_STYLES = {
  get: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  post: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  put: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  patch: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  delete: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
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
  return 'text-[#0B4D99]';
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
      const headers = { 'X-Requested-With': 'Petrolenz' };
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
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B4D99] dark:text-white">API documentation</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#4f6490] dark:text-dash-muted">
            Every backend route, with request shapes and a live Try it panel using your current session.
          </p>
        </div>
        <a
          href={swaggerUiUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B4D99] px-4 py-2 text-sm font-medium text-white hover:bg-[#093d7a]"
        >
          <BookOpen size={16} />
          Open Swagger UI
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7a8794]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search method, path, or tag"
            className="w-full rounded-lg border border-[#c4d2f0] bg-white py-2 pl-9 pr-3 text-sm dark:border-dash-border dark:bg-dash-surface dark:text-white"
          />
        </label>
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${tokenPresent ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300' : 'border-[#c4d2f0] text-[#7a8794]'}`}>
          <ShieldCheck size={14} />
          {tokenPresent ? 'Session token attached to Try it' : 'Login first for protected routes'}
        </span>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>
      ) : !spec ? (
        <p className="flex items-center gap-2 text-sm text-[#4f6490]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading OpenAPI spec…
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([tag, ops]) => (
            <section key={tag}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7a8794]">{tag}</h2>
              <div className="space-y-2">
                {ops.map((op) => {
                  const expanded = openId === op.id;
                  const resolvedParams = op.parameters.map((p) => resolveParam(p, spec)).filter(Boolean);
                  const pathParams = resolvedParams.filter((p) => p.in === 'path');
                  const queryParams = resolvedParams.filter((p) => p.in === 'query');
                  return (
                    <article key={op.id} className="overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white dark:border-dash-border dark:bg-dash-surface">
                      <button
                        type="button"
                        onClick={() => toggle(op)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span className={`w-16 rounded-md px-2 py-0.5 text-center text-[11px] font-bold uppercase ${METHOD_STYLES[op.method] || METHOD_STYLES.get}`}>
                          {op.method}
                        </span>
                        <code className="text-sm font-semibold text-[#0c2340] dark:text-white">{op.path}</code>
                        <span className="hidden text-sm text-[#4f6490] sm:inline dark:text-slate-300">{op.summary}</span>
                      </button>
                      {expanded && (
                        <div className="space-y-4 border-t border-[#e4ebf7] px-4 py-4 dark:border-dash-border">
                          {op.description ? <p className="whitespace-pre-wrap text-sm text-[#4f6490] dark:text-slate-300">{op.description}</p> : null}
                          {pathParams.map((param) => (
                            <label key={param.name} className="block text-sm">
                              <span className="font-medium">{param.name} (path)</span>
                              <input
                                value={pathValues[param.name] || ''}
                                onChange={(e) => setPathValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated"
                                placeholder={param.schema?.example || param.name}
                              />
                            </label>
                          ))}
                          {queryParams.map((param) => (
                            <label key={param.name} className="block text-sm">
                              <span className="font-medium">{param.name} (query)</span>
                              <input
                                value={queryValues[param.name] || ''}
                                onChange={(e) => setQueryValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated"
                                placeholder={String(param.schema?.default ?? '')}
                              />
                            </label>
                          ))}
                          {isMultipart(op) ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="text-sm">
                                Document type
                                <input
                                  value={formFields.documentType}
                                  onChange={(e) => setFormFields((prev) => ({ ...prev, documentType: e.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated"
                                />
                              </label>
                              <label className="text-sm">
                                Report category
                                <input
                                  value={formFields.reportCategory}
                                  onChange={(e) => setFormFields((prev) => ({ ...prev, reportCategory: e.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated"
                                  placeholder="process"
                                />
                              </label>
                              <label className="text-sm">
                                Main documents
                                <input
                                  type="file"
                                  multiple
                                  className="mt-1 w-full text-sm"
                                  onChange={(e) => setFiles((prev) => ({ ...prev, mainDocument: [...e.target.files] }))}
                                />
                              </label>
                              <label className="text-sm">
                                Support documents
                                <input
                                  type="file"
                                  multiple
                                  className="mt-1 w-full text-sm"
                                  onChange={(e) => setFiles((prev) => ({ ...prev, supportDocument: [...e.target.files] }))}
                                />
                              </label>
                            </div>
                          ) : jsonBodySchema(op) || op.requestBody ? (
                            <label className="block text-sm">
                              Request body
                              <textarea
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                                rows={8}
                                className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 font-mono text-xs dark:border-dash-border dark:bg-dash-surface-elevated"
                              />
                            </label>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => run(op)}
                            disabled={running}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0B4D99] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                          >
                            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play size={14} />}
                            Try it
                          </button>
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7a8794]">Responses</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(op.responses).map(([code, resp]) => (
                                <span key={code} className="rounded-md bg-[#eef2f7] px-2 py-1 text-xs dark:bg-[#1e293b]">
                                  {code} {resp.description}
                                </span>
                              ))}
                            </div>
                          </div>
                          {result && (
                            <pre className="max-h-80 overflow-auto rounded-xl bg-[#0c2340] p-3 text-xs text-slate-100">
                              <span className={statusColor(result.status)}>
                                {result.status} {result.statusText}
                              </span>
                              {'\n'}
                              {result.body}
                            </pre>
                          )}
                        </div>
                      )}
                    </article>
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
