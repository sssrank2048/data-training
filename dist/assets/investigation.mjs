// Derived analysis only: every measurement comes from imported case rows.
import { aggregate, divide, groupRows, scenario } from './analytics.mjs';

export const COURSE_REVISION = 2;
export const DEFAULT_BRAND_TERMS = 'air france, airfrance';
export const normalizeKeyword = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
export function brandTerms(text = DEFAULT_BRAND_TERMS) {
  return [...new Set(text.split(/[,，;；\n]/).map(normalizeKeyword).filter(Boolean))];
}
export function classifyKeyword(keyword, termsText = DEFAULT_BRAND_TERMS) {
  const value = normalizeKeyword(keyword);
  if (!value) return '缺少关键词';
  const matched = brandTerms(termsText).some(term => (` ${value} `).includes(` ${term} `));
  return matched ? '品牌命中' : '非品牌候选';
}
export function classifiedRows(rows, terms) {
  return rows.map(row => ({ ...row, brand: classifyKeyword(row.keyword, terms) }));
}
export function mixComparison(rows, a, b, terms = DEFAULT_BRAND_TERMS) {
  const tagged = classifiedRows(rows, terms);
  const channels = [a, b].map(name => {
    const items = tagged.filter(row => row.publisher === name);
    return { name, raw: aggregate(items), strata: Object.fromEntries(groupRows(items, 'brand').map(g => [g.name, g])) };
  });
  const common = ['品牌命中', '非品牌候选'].filter(k => channels.every(c => c.strata[k]?.clicks > 0));
  const commonClicks = common.reduce((sum, k) => sum + channels.reduce((s, c) => s + c.strata[k].clicks, 0), 0);
  const weights = Object.fromEntries(common.map(k => [k, channels.reduce((s, c) => s + c.strata[k].clicks, 0) / commonClicks]));
  return {
    common, weights, valid: a !== b && common.length > 0 && brandTerms(terms).length > 0,
    channels: channels.map(c => {
      const commonRowsClicks = common.reduce((s, k) => s + c.strata[k].clicks, 0);
      const cvr = common.length ? common.reduce((s, k) => s + weights[k] * c.strata[k].cvr, 0) : null;
      const cpc = common.length ? common.reduce((s, k) => s + weights[k] * c.strata[k].cpc, 0) : null;
      const revenuePerClick = common.length ? common.reduce((s, k) => s + weights[k] * divide(c.strata[k].revenue, c.strata[k].clicks), 0) : null;
      return { ...c, coverage: divide(commonRowsClicks, c.raw.clicks), adjusted: { cvr, cpc, roas: divide(revenuePerClick, cpc) } };
    })
  };
}

// Symmetric two-factor decomposition. Contributions sum exactly to CPA_A - CPA_B.
export function decomposeCPA(a, b) {
  if (![a.cpc, b.cpc, a.cvr, b.cvr].every(v => Number.isFinite(v) && v > 0)) return null;
  const costContribution = (a.cpc - b.cpc) * (1 / a.cvr + 1 / b.cvr) / 2;
  const conversionContribution = (1 / a.cvr - 1 / b.cvr) * (a.cpc + b.cpc) / 2;
  return { from: b.cpa, to: a.cpa, delta: a.cpa - b.cpa, costContribution, conversionContribution };
}

const recordKey = r => JSON.stringify([r.sourceSheet, r.sourceRow]);
export function candidateRows(rows, threshold) {
  return rows.filter(r => r.clicks >= threshold && r.bookings === 0).sort((a, b) => b.cost - a.cost || a.sourceRow - b.sourceRow);
}
export function thresholdSensitivity(rows, reference = 50) {
  const baseline = candidateRows(rows, reference).slice(0, 10);
  const keys = new Set(baseline.map(recordKey));
  const total = aggregate(rows);
  return [...new Set([10, 50, 100, 200, reference])].sort((a, b) => a - b).map(threshold => {
    const candidates = candidateRows(rows, threshold), totals = aggregate(candidates);
    const top = candidates.slice(0, 10);
    return { threshold, count: candidates.length, cost: totals.cost, share: divide(totals.cost, total.cost), overlap: top.filter(r => keys.has(recordKey(r))).length, referenceCount: baseline.length };
  });
}

// Allocate whole cents with largest remainders, so each benchmark uses the same budget.
export function allocateBudget(groups, cap, field = 'cost') {
  if (!Number.isFinite(cap) || cap < 0 || cap > 1e12) throw Error('预算需在 0 到 1 万亿美元之间。');
  const cents = Math.round(cap * 100), weights = groups.map(g => Math.max(0, g[field] || 0));
  const sum = weights.reduce((s, v) => s + v, 0);
  if (!sum) return null;
  const raw = weights.map(w => cents * w / sum), result = raw.map(Math.floor);
  const remainder = cents - result.reduce((s, n) => s + n, 0);
  const order = raw.map((v, i) => ({ i, fraction: v - result[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let i = 0; i < remainder; i++) result[order[i % order.length].i]++;
  return Object.fromEntries(groups.map((g, i) => [g.name, result[i] / 100]));
}

export function stressPlan(groups, budgets, baseBudgets, { cpcChange = 0, cvrChange = 0, expansionDrop = 0, cap = null } = {}) {
  if (!Number.isFinite(expansionDrop) || expansionDrop < 0 || expansionDrop > 100) throw Error('新增分配部分的预订率折损需在 0% 到 100% 之间。');
  const normal = scenario(groups, budgets, { cpcChange, cvrChange, cap });
  const original = scenario(groups, budgets, { cap });
  let expansionRevenue = 0;
  const adjustedRows = normal.rows.map((r, i) => {
    const expandedBudget = Math.max(0, r.budget - baseBudgets[groups[i].name]);
    const fraction = r.budget > 0 ? expandedBudget / r.budget : 0;
    if (r.revenue !== null) expansionRevenue += r.revenue * fraction;
    const multiplier = 1 - fraction * expansionDrop / 100;
    return { ...r, expandedBudget, revenue: r.revenue === null ? null : r.revenue * multiplier, bookings: r.bookings === null ? null : r.bookings * multiplier };
  });
  const revenue = normal.valid ? adjustedRows.reduce((s, r) => s + r.revenue, 0) : null;
  return { ...normal, rows: adjustedRows, baseRevenue: original.revenue, expansionRevenue, revenue, bookings: normal.valid ? adjustedRows.reduce((s, r) => s + r.bookings, 0) : null, balance: revenue === null ? null : revenue - normal.budget };
}
export function comparePlans(groups, custom, options) {
  const historical = allocateBudget(groups, options.cap), weighted = allocateBudget(groups, options.cap, 'roas');
  if (!historical) throw Error('当前文件没有可用于历史占比分配的花费。');
  const defs = [{ id: 'historical', name: '历史占比分配', budgets: historical }, { id: 'roas', name: '按历史 ROAS 权重分配', budgets: weighted }, { id: 'custom', name: '我的方案', budgets: custom }];
  return defs.map(plan => ({ ...plan, result: plan.budgets ? stressPlan(groups, plan.budgets, historical, options) : null }));
}
export function budgetSignature(dataHash, budgets, options) {
  return JSON.stringify({ dataHash, budgets: Object.entries(budgets).sort(([a], [b]) => a.localeCompare(b)), ...options });
}
export function isSubmitted(note, hash) {
  return !!(hash && note?.complete && note.courseRevision === COURSE_REVISION && note.datasetHash === hash);
}
