'use strict';
const embeddings = require('../../memory-core/embeddings');
const { queryTerms, lexicalScore } = require('../../memory-core/recallText');
const { filterCandidates } = require('../../memory-core/recallPolicy');

module.exports = db => async function search({ q, category, layer, tags, source, date, limit = 50, offset = 0,
  semantic, residentScope, readPolicy, identityOnly, candidateFilter } = {}) {
  const warnings = [], passages = new Map();
  let docs = await db._allActive();
  if (category) docs = docs.filter(row => row.category === category);
  if (source) docs = docs.filter(row => row.source === source);
  if (layer) docs = docs.filter(row => row.layer === layer);
  docs = filterCandidates(docs, residentScope, readPolicy);
  if (candidateFilter) docs = await candidateFilter(docs);
  if (identityOnly) docs = docs.filter(row => row.v2?.lifecycle === 'core' || row.v2?.identityRole);
  if (tags?.length) docs = docs.filter(row => tags.every(tag => row.tags.includes(tag)));
  if (date) docs = docs.filter(row => row.created_at?.startsWith(date));

  if (q?.trim()) {
    const terms = queryTerms(q), now = Date.now();
    const keyword = docs.map(row => {
      const coverage = lexicalScore([row.title, row.content, row.category, ...row.tags].join(' '), terms);
      const title = lexicalScore(row.title, terms);
      const age = Math.max(0, (now - Date.parse(row.created_at)) / 86400000);
      return { row, matched: coverage > 0, score: (coverage * .8 + title * .2) * .6 + row.importance / 10 * .25 + Math.max(0, 1 - age / 365) * .15 };
    }).filter(hit => hit.matched).sort((a, b) => b.score - a.score).map(hit => hit.row);
    let vectors = [];
    if (semantic !== false) {
      try {
        const settings = await db.getSettings();
        if (embeddings.isConfigured(settings)) vectors = (await embeddings.rankBySimilarity(q.trim(), docs.map(row => ({ ...row, _id: row.id })), settings)).map(hit => {
          if (hit.excerpt) passages.set(hit.doc.id || hit.doc._id, hit.excerpt);
          return hit.doc;
        });
        else warnings.push('语义检索尚未配置，当前按关键词查找；空结果不代表记忆不存在。');
      } catch {
        warnings.push('语义检索暂时不可用，当前按关键词查找；空结果不代表记忆不存在。');
      }
    }
    if (!vectors.length) docs = keyword;
    else {
      const scores = new Map(), byId = new Map(docs.map(row => [row.id, row]));
      keyword.forEach((row, i) => scores.set(row.id, (scores.get(row.id) || 0) + 1 / (61 + i)));
      vectors.forEach((row, i) => { const id = row.id || row._id; scores.set(id, (scores.get(id) || 0) + 1 / (61 + i)); });
      docs = [...scores].sort((a, b) => b[1] - a[1]).map(([id]) => byId.get(id)).filter(Boolean);
    }
  }
  const items = docs.slice(Number(offset) || 0, (Number(offset) || 0) + Math.min(Number(limit) || 50, 10000))
    .map(row => ({ ...row, ...(passages.has(row.id) ? { retrievalExcerpt: passages.get(row.id) } : {}) }));
  Object.defineProperty(items, 'warnings', { value: warnings });
  return items;
};
