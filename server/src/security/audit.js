function audit(event, fields = {}) {
  const line = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  console.log(`[audit] ${JSON.stringify(line)}`);
}

module.exports = { audit };
