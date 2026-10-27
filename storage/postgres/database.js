'use strict';
const { sql } = require('./client');
const embeddings = require('../../memory-core/embeddings');
const { createMemoryGateway } = require('../../memory-core/memoryGateway');
const { createPostgresJournal } = require('./journal');
const postgresOrganization = require('./organizationStore');
require('../../memory-core/organizationStore').configureOrganizationStore(postgresOrganization.organizationStore);

const iso = value => value?.toISOString?.() || value || null;
function format(row) {
  if (!row) return null;
  return { id: row.id, title: row.title, content: row.content, category: row.category, layer: row.layer,
    tags: row.tags || [], source: row.source, author: row.author, mood: row.mood, importance: row.importance,
    v2: row.v2 || {}, organizationStale: Boolean(row.organization_stale), expires_at: iso(row.expires_at),
    is_deleted: Boolean(row.is_deleted), deleted_at: iso(row.deleted_at), created_at: iso(row.created_at), updated_at: iso(row.updated_at) };
}

const db = {
  async _allActive() { return (await sql`select * from memory.memories where is_deleted=false order by created_at desc`).map(format); },
  async create({ id, title, content, category = 'general', layer = 'longterm', tags = [], source = 'manual', author = null,
    mood = null, created_at = null, importance = 5, v2 = {} }) {
    const now = created_at ? new Date(created_at).toISOString() : new Date().toISOString();
    const [row] = await sql`insert into memory.memories
      (id,title,content,category,layer,tags,source,author,mood,importance,v2,created_at,updated_at)
      values (${id},${title},${content},${category},${layer},${sql.json(tags || [])},${source},${author},${mood},
        ${Number(importance) || 5},${sql.json(v2 && typeof v2 === 'object' ? v2 : {})},${now},${now}) returning *`;
    const memory = format(row); this._embedSoon(memory); return memory;
  },
  _embedSoon(memory) { setImmediate(async () => { try { await embeddings.embedMemory(memory, await this.getSettings()); } catch { console.warn('Embedding unavailable; memory remains saved.'); } }); },
  async getById(id) { const rows = await sql`select * from memory.memories where id=${id}`; return format(rows[0]); },
  async update(id, input) {
    const current = await this.getById(id); if (!current) return null;
    const updated = new Date(Math.max(Date.now(), (Date.parse(current.updated_at) || 0) + 1)).toISOString();
    const next = { title: input.title ?? current.title, content: input.content ?? current.content,
      category: input.category ?? current.category, layer: input.layer ?? current.layer,
      tags: input.tags ?? current.tags, source: input.source ?? current.source, author: input.author ?? current.author,
      mood: input.mood ?? current.mood, importance: input.importance !== undefined ? Number(input.importance) || 5 : current.importance,
      v2: input.v2 !== undefined ? (input.v2 && typeof input.v2 === 'object' ? input.v2 : {}) : current.v2 };
    const [row] = await sql`update memory.memories set title=${next.title},content=${next.content},category=${next.category},
      layer=${next.layer},tags=${sql.json(next.tags)},source=${next.source},author=${next.author},mood=${next.mood},
      importance=${next.importance},v2=${sql.json(next.v2)},updated_at=${updated} where id=${id} returning *`;
    const memory = format(row); this._embedSoon(memory); return memory;
  },
  async delete(id) { return (await sql`update memory.memories set is_deleted=true,deleted_at=now() where id=${id} returning id`).length > 0; },
  async restore(id) { return (await sql`update memory.memories set is_deleted=false,deleted_at=null where id=${id} returning id`).length > 0; },
  async permanentDelete(id) { const ok = (await sql`delete from memory.memories where id=${id} returning id`).length > 0; embeddings.removeEmbedding(id).catch(() => {}); return ok; },
  async getTrash() { return (await sql`select * from memory.memories where is_deleted=true order by deleted_at desc`).map(format); },
  async getSettings() { const rows = await sql`select key,value from memory.settings`; return Object.fromEntries(rows.map(row => [row.key, row.value])); },
  async setSetting(key, value) { await sql`insert into memory.settings (key,value,updated_at) values (${key},${sql.json(value)},now())
    on conflict (key) do update set value=excluded.value,updated_at=now()`; },
  async setSettings(values) { for (const [key, value] of Object.entries(values)) await this.setSetting(key, value); },
};
db.search = require('./search')(db);
module.exports = createMemoryGateway(db, {
  activityStore: postgresOrganization.organizationStore(),
  journal: createPostgresJournal(sql),
  chatsDB: require('./chats'),
});
