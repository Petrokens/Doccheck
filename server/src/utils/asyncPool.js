function mapWithConcurrency(items, limit, mapper) {
  const list = Array.isArray(items) ? items : [];
  const n = Math.max(1, Number(limit) || 1);
  let index = 0;
  const results = new Array(list.length);

  async function worker() {
    while (index < list.length) {
      const i = index;
      index += 1;
      results[i] = await mapper(list[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(n, list.length || 1) }, () => worker());
  return Promise.all(workers).then(() => results);
}

module.exports = { mapWithConcurrency };
