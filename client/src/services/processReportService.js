import api, { setAccessToken } from '../lib/axios';
import { bearerAuthHeaders, getValidAccessToken } from '../lib/authToken';
import { refreshAccessToken } from './authService';
import { API_BASE_URL } from '../config';

function appendFiles(formData, field, files) {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  list.filter(Boolean).forEach((f) => formData.append(field, f));
}

export async function generateProcessReport({ documentType, mainDocument, supportDocument, reportCategory }) {
  const formData = new FormData();
  formData.append('documentType', documentType);
  if (reportCategory) formData.append('reportCategory', reportCategory);
  formData.append('workflow', 'qaqc');
  appendFiles(formData, 'mainDocument', mainDocument);
  appendFiles(formData, 'supportDocument', supportDocument);
  const response = await api.post('/qaqc/process-report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
  return response.data?.report;
}

async function postStream(formData, accessToken) {
  return fetch(`${API_BASE_URL}/qaqc/process-report/stream`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: bearerAuthHeaders(accessToken),
  });
}

export async function generateProcessReportStream(params, { onLog, onReport, onError } = {}) {
  const makeBody = () => {
    const formData = new FormData();
    formData.append('documentType', params.documentType || '');
    if (params.reportCategory) formData.append('reportCategory', params.reportCategory);
    formData.append('workflow', 'qaqc');
    appendFiles(formData, 'mainDocument', params.mainDocument);
    appendFiles(formData, 'supportDocument', params.supportDocument);
    return formData;
  };

  let accessToken = await getValidAccessToken();
  let response = await postStream(makeBody(), accessToken);
  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    setAccessToken(accessToken);
    response = await postStream(makeBody(), accessToken);
  }
  if (!response.ok || !response.body) {
    throw new Error(`Streaming request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedReport = null;
  let pendingReportId = null;
  let streamError = null;

  const flushEvent = (eventBlock) => {
    const block = String(eventBlock || '').trim();
    if (!block) return;
    const lines = block.split('\n');
    const eventLine = lines.find((line) => line.startsWith('event:'));
    const dataLines = lines.filter((line) => line.startsWith('data:'));
    if (!eventLine || !dataLines.length) return;
    const eventType = eventLine.replace(/^event:\s*/, '').trim();
    let payload;
    try {
      payload = JSON.parse(dataLines.map((line) => line.replace(/^data:\s*/, '')).join('\n'));
    } catch {
      return;
    }
    if (eventType === 'log') onLog?.(payload.line || '');
    if (eventType === 'error') {
      streamError = payload.message || 'Failed to generate report.';
      onError?.(streamError);
    }
    if (eventType === 'report') {
      const inline = payload.report;
      if (inline?.report_markdown) {
        receivedReport = inline;
        onReport?.(inline);
      } else if (payload.reportId || inline?.id) {
        pendingReportId = payload.reportId || inline.id;
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      events.forEach(flushEvent);
    }
    if (done) break;
  }
  if (buffer.trim()) flushEvent(buffer);
  if (streamError) throw new Error(streamError);
  if (!receivedReport && pendingReportId) {
    receivedReport = await fetchProcessReport(pendingReportId);
    onReport?.(receivedReport);
  }
  return receivedReport;
}

export async function fetchProcessReport(id) {
  const response = await api.get(`/qaqc/reports/${id}`);
  return response.data?.report;
}

export async function fetchProcessHistory({ page = 1, limit = 100 } = {}) {
  const response = await api.get('/qaqc/reports', { params: { page, limit } });
  return response.data;
}

export async function deleteProcessReport(id) {
  await api.delete(`/qaqc/reports/${id}`);
}

export async function printProcessReportPdf(id) {
  const token = await getValidAccessToken();
  const response = await fetch(`${API_BASE_URL}/qaqc/reports/${id}/download`, {
    credentials: 'include',
    headers: bearerAuthHeaders(token),
  });
  if (!response.ok) throw new Error('Failed to download PDF');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function fetchReportDashboardStats() {
  const response = await api.get('/qaqc/dashboard-stats');
  return response.data;
}

export async function getSidebarData() {
  const response = await api.get('/sidebar');
  const sections = Array.isArray(response.data) ? response.data : [];
  return sections
    .filter((section) => !['analytics', 'system'].includes(String(section.title || '').toLowerCase()))
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => {
        const label = String(item.label || '').toLowerCase();
        const path = String(item.path || '').toLowerCase();
        return label !== 'report templates' && !path.endsWith('/templates');
      }),
    }))
    .filter((section) => section.items?.length);
}
