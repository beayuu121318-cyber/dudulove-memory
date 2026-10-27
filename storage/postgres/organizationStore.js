'use strict';
const { sql } = require('./client');
let singleton;
function organizationStore() {
  if (singleton) return singleton;
  const queues = new Map();
  singleton = {
    async get(id) { const rows = await sql`select value from memory.kv where id=${id}`; return rows[0]?.value || null; },
    async list(query = {}) {
      const rows = await sql`select value from memory.kv order by sequence desc nulls last, updated_at desc`;
      return rows.map(row => row.value).filter(value => Object.entries(query).every(([key, wanted]) => value?.[key] === wanted));
    },
    async put(id, value) {
      await sql`insert into memory.kv (id,value,sequence,updated_at) values (${id},${sql.json({ ...value, _id: id })},${value.sequence || null},now())
        on conflict (id) do update set value=excluded.value,sequence=excluded.sequence,updated_at=now()`;
      return { ...value, _id: id };
    },
    async lock(key, fn) {
      const next = (queues.get(key) || Promise.resolve()).catch(() => {}).then(fn); queues.set(key, next);
      try { return await next; } finally { if (queues.get(key) === next) queues.delete(key); }
    },
    nextSequence() { return this.lock('sequence', async () => {
      const rows = await sql`insert into memory.sequences (name,value) values ('organization',1)
        on conflict (name) do update set value=memory.sequences.value+1 returning value`;
      return Number(rows[0].value);
    }); },
  };
  return singleton;
}
module.exports = { organizationStore };
