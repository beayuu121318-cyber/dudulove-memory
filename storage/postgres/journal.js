'use strict';
const { normalizedHash, refKeys } = require('../../memory-core/memoryJournal');

function createPostgresJournal(sql) {
  const append = async event => {
    const timestamp = new Date().toISOString();
    const [row] = await sql`insert into memory.audit_events (kind, memory_id, resident_id, event, created_at)
      values (${event.kind || ''}, ${event.memoryId || null}, ${event.residentId || null}, ${sql.json({ ...event, timestamp })}, ${timestamp})
      returning event`;
    return row.event;
  };
  return {
    append,
    async list({ memoryId, residentId, kind, limit = 100 } = {}) {
      const rows = await sql`select event from memory.audit_events
        where (${memoryId || null}::text is null or memory_id = ${memoryId || null})
          and (${residentId || null}::text is null or resident_id = ${residentId || null})
          and (${kind || null}::text is null or kind = ${kind || null})
        order by created_at desc limit ${Math.min(Number(limit) || 100, 1000)}`;
      return rows.map(row => row.event);
    },
    async isRejected({ residentId, content, sourceRefs }) {
      const rows = await this.list({ residentId, kind: 'rejection', limit: 1000 });
      const hash = normalizedHash(content), keys = refKeys(sourceRefs);
      return rows.some(row => !row.withdrawn && ((content !== undefined && row.normalizedHash === hash) ||
        (row.sourceKeys || []).some(left => keys.some(right => left === right))));
    },
    async attestedSources(memoryId) { return this.list({ memoryId, kind: 'source-attestation', limit: 1000 }); },
    async clearRejection(memoryId) {
      const rows = await sql`select id, event from memory.audit_events where kind = 'rejection' and memory_id = ${memoryId}`;
      for (const row of rows) await sql`update memory.audit_events set event = ${sql.json({ ...row.event, withdrawn: true })} where id = ${row.id}`;
    },
    reject({ memoryId, residentId, content, sourceRefs, actor, reason, migrationId }) {
      return append({ kind: 'rejection', memoryId, residentId, normalizedHash: content === undefined ? null : normalizedHash(content),
        sourceKeys: refKeys(sourceRefs), sourceRefs, actor, reason, migrationId });
    },
  };
}
module.exports = { createPostgresJournal };
