'use strict';
const postgres = require('postgres');

const url = process.env.MEMORY_DATABASE_URL;
if (!url) throw new Error('MEMORY_DATABASE_URL is required for Supabase storage');

const sql = postgres(url, {
  max: Math.max(1, Number(process.env.MEMORY_DATABASE_POOL_SIZE) || 3),
  idle_timeout: 20,
  connect_timeout: 15,
  prepare: false,
  ssl: process.env.MEMORY_DATABASE_SSL === 'disable' ? false : 'require',
});

module.exports = { sql };
