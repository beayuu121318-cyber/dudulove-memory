'use strict';
const crypto = require('node:crypto');
const { sql } = require('./client');
const map = row => row ? { id: row.id, residentId: row.resident_id, title: row.title, source: row.source,
  raw_content: row.raw_content, messages: row.messages || [], created_at: row.created_at?.toISOString?.() || row.created_at,
  updated_at: row.updated_at?.toISOString?.() || row.updated_at, date: row.event_date?.toISOString?.().slice(0, 10) || String(row.event_date) } : null;
module.exports = {
  async create(input) {
    if (!input.residentId) throw new Error('Chat material requires a resident identity');
    const id = crypto.randomUUID(), now = new Date().toISOString();
    const [row] = await sql`insert into memory.chat_materials
      (id,resident_id,title,source,raw_content,messages,created_at,updated_at,event_date)
      values (${id},${input.residentId},${String(input.title || '聊天资料')},${String(input.source || 'manual')},
        ${String(input.raw_content || '')},${sql.json(input.messages || [])},${now},${now},${now.slice(0,10)}) returning *`;
    return map(row);
  },
  async getById(id) { const rows = await sql`select * from memory.chat_materials where id=${id}`; return map(rows[0]); },
  async search({ residentId, dateFrom, limit = 30 } = {}) {
    if (!residentId) return { items: [] };
    const rows = await sql`select * from memory.chat_materials where resident_id=${residentId}
      and (${dateFrom || null}::date is null or event_date >= ${dateFrom || null}::date)
      order by created_at desc limit ${Math.min(200, Number(limit) || 30)}`;
    return { items: rows.map(map) };
  },
};
