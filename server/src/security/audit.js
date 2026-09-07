const MAX_EVENTS = 250;
const startedAt = new Date().toISOString();
const events = [];

function audit(event, fields = {}) {
  const line = {
    ts: new Date().toISOString(),
    event: String(event || 'unknown'),
    ...fields,
  };
  events.push(line);
  if (events.length > MAX_EVENTS) events.shift();
  console.log(`[audit] ${JSON.stringify(line)}`);
}

function recent(limit = 200) {
  const take = Math.min(MAX_EVENTS, Math.max(1, Number(limit) || 200));
  return events.slice(-take).reverse();
}

module.exports = { audit, recent, startedAt };
