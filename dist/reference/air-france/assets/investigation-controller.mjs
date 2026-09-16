import { lessons, assignments } from './course.mjs';
import { aggregate, groupRows, filteredRows, csvText } from './analytics.mjs';
import { esc } from './charts.mjs';
import { investigationViews } from './investigation-views.mjs';
import { COURSE_REVISION, DEFAULT_BRAND_TERMS, brandTerms, classifiedRows, mixComparison, candidateRows, thresholdSensitivity, allocateBudget, comparePlans, budgetSignature, isSubmitted } from './investigation.mjs';

export function investigationController(state, { render, save, toast, download }) {
  Object.assign(state, { brandTerms: DEFAULT_BRAND_TERMS, mixA: '', mixB: '', decompA: '', decompB: '', expansionDrop: 0 });
  const views = investigationViews(state);
  const hash = () => state.data?.meta.sha256;
  const currentOptions = () => ({ cap: state.cap, cpcChange: state.cpcChange, cvrChange: state.cvrChange, expansionDrop: state.expansionDrop });
  const signature = () => budgetSignature(hash(), state.budgets, currentOptions());
  const submitted = id => isSubmitted(state.notes[id], hash());
  function invalidate(id) {
    const index = lessons.findIndex(l => l.id === id);
    for (const l of lessons.slice(index)) if (state.notes[l.id]) state.notes[l.id].complete = false;
    if (id !== 'q4' && state.notes.q4?.scenario) state.notes.q4.scenario.evidenceChanged = true;
  }
  function updateStatus(id) {
    const el = document.querySelector('#save-status');
    if (el) el.textContent = '草稿已保存到此浏览器，修改后请重新提交证据。';
    const button = document.querySelector(`[data-action="complete"][data-id="${id}"]`);
    if (button) button.textContent = '提交本题证据';
  }
  function updateScenario() {
    const el = document.querySelector('#scenario-results');
    if (!el) return;
    try { el.innerHTML = views.budgetResults(); }
    catch (error) { el.innerHTML = `<div class="notice"><p>${esc(error.message)}</p></div>`; }
  }
  function dataLoaded() {
    const snapshot = state.notes.q4?.scenario;
    if (snapshot?.courseRevision === COURSE_REVISION && snapshot.datasetHash === hash() && snapshot.options && snapshot.budgets) {
      state.budgets = { ...snapshot.budgets };
      Object.assign(state, snapshot.options);
    }
    const context = state.notes.q2?.analysisContext;
    if (state.notes.q2?.datasetHash === hash() && context) {
      state.brandTerms = context.brandTerms || DEFAULT_BRAND_TERMS;
      state.mixA = context.mixA || ''; state.mixB = context.mixB || '';
    }
    const diagnostic = state.notes.q3?.analysisContext;
    if (state.notes.q3?.datasetHash === hash() && diagnostic) {
      for (const key of ['publisher', 'campaign', 'query', 'minClicks', 'decompA', 'decompB']) if (diagnostic[key] !== undefined) state[key] = diagnostic[key];
    }
  }
  function complete(id) {
    if (submitted(id)) { invalidate(id); save(); render(); toast('已撤回提交，相关后题需要重新提交。'); return; }
    const note = state.notes[id] || {}, assignment = assignments[id];
    if (!state.data || !hash()) { toast('先导入案例数据，再提交证据。'); return; }
    if (!views.attempted(id)) { toast('先保存初判，再完成分析。'); return; }
    if (!note.text?.trim() || assignment.evidence.some(([key]) => !note.evidence?.[key]?.trim())) { toast('请填写分析结论与三项证据。'); return; }
    const prior = lessons.slice(0, lessons.findIndex(l => l.id === id));
    if (prior.some(l => !submitted(l.id))) { toast('请先提交前面题目的当前数据证据。'); return; }
    const references = Object.fromEntries(prior.map(l => [l.id, { submittedAt: state.notes[l.id].submittedAt, evidence: structuredClone(state.notes[l.id].evidence), conclusion: state.notes[l.id].text }]));
    const context = id === 'q3' ? { publisher: state.publisher, campaign: state.campaign, query: state.query, minClicks: state.minClicks } : undefined;
    state.notes[id] = { ...note, complete: true, courseRevision: COURSE_REVISION, datasetHash: hash(), submittedAt: new Date().toISOString(), references, ...(context ? { analysisContext: context } : {}) };
    save(); render(); toast('练习证据已提交。经营判断仍需讲师评阅，参考答案始终可查看。');
  }
  async function click(action, button) {
    if (action === 'save-initial') {
      const id = button.dataset.id, note = state.notes[id] || {};
      if (!state.data || !hash()) { toast('先到数据页导入案例文件。'); return true; }
      if (!note.initial?.trim()) { toast('先写下初判和验证方法。'); return true; }
      if (id === 'q1' && ['cpc', 'cpa', 'roas'].some(key => !String(note.calcs?.[key] ?? '').trim() || !Number.isFinite(Number(note.calcs[key])) || Number(note.calcs[key]) < 0)) { toast('请先填写独立计算的 CPC、CPA 和 ROAS；允许答案有误。'); return true; }
      invalidate(id);
      state.notes[id] = { ...note, attemptHash: hash(), initialSavedAt: new Date().toISOString() };
      save(); state.tab = 'analysis'; render(); window.scrollTo(0, 0); return true;
    }
    if (action === 'complete') { complete(button.dataset.id); return true; }
    if (action === 'apply-mix') {
      const a = document.querySelector('#mix-a').value, b = document.querySelector('#mix-b').value, terms = document.querySelector('#brand-terms').value;
      if (a === b || !brandTerms(terms).length) { toast('请选择不同渠道，并填写至少一个品牌词组。'); return true; }
      state.mixA = a; state.mixB = b; state.brandTerms = terms; invalidate('q2'); save(); render(); return true;
    }
    if (action === 'apply-decomposition') {
      if (document.querySelector('#decomp-a').value === document.querySelector('#decomp-b').value) { toast('请选择两个不同活动。'); return true; }
      state.decompA = document.querySelector('#decomp-a').value; state.decompB = document.querySelector('#decomp-b').value;
      invalidate('q3'); save(); render(); return true;
    }
    if (action === 'apply-filters') {
      const min = Number(document.querySelector('#min-clicks').value);
      if (!Number.isInteger(min) || min < 0) { toast('点击门槛应为非负整数。'); return true; }
      state.publisher = document.querySelector('#publisher-filter').value; state.campaign = document.querySelector('#campaign-filter').value; state.query = document.querySelector('#keyword-query').value; state.minClicks = min; state.page = 0;
      invalidate('q3'); save(); render(); return true;
    }
    if (action === 'reset-budget' || action === 'seed-roas') {
      const groups = groupRows(state.data.rows, 'publisher');
      if (action === 'reset-budget') { state.cap = Number(aggregate(state.data.rows).cost.toFixed(2)); state.cpcChange = 0; state.cvrChange = 0; state.expansionDrop = 0; }
      try {
        const allocation = allocateBudget(groups, state.cap, action === 'seed-roas' ? 'roas' : 'cost');
        if (!allocation) throw Error('当前数据无法使用该分配规则。');
        state.budgets = allocation; invalidate('q4'); save(); render();
      } catch (error) { toast(error.message); }
      return true;
    }
    if (action === 'save-scenario') {
      try {
        const options = currentOptions(), plans = comparePlans(groupRows(state.data.rows, 'publisher'), state.budgets, options);
        const own = plans[2].result;
        if (!own.valid || Math.abs(own.budget - state.cap) > .005) throw Error('请按同一预算完整分配，并检查不可计算的渠道。');
        if (lessons.slice(0, 3).some(l => !submitted(l.id))) throw Error('前三题证据需要先提交。');
        invalidate('q4');
        state.notes.q4 = { ...state.notes.q4, scenario: { courseRevision: COURSE_REVISION, datasetHash: hash(), signature: signature(), savedAt: new Date().toISOString(), options, budgets: { ...state.budgets }, plans, evidenceChanged: false, rule: '新增分配部分 = max(0, 本方案渠道预算 − 同预算历史花费占比基准)；只对该部分额外折损 CVR。' } };
        save(); updateStatus('q4'); toast('三方案、压力假设与结果已保存到本题。');
      } catch (error) { toast(error.message); }
      return true;
    }
    if (action === 'export-classification') {
      const rows = classifiedRows(state.data.rows.filter(r => [state.mixA, state.mixB].includes(r.publisher)), state.brandTerms);
      download(csvText(['Source Sheet', 'Source Row', 'Publisher', 'Keyword', 'Rule classification', 'Rule terms', 'Clicks', 'Bookings', 'Cost', 'Revenue'], rows.map(r => [r.sourceSheet, r.sourceRow, r.publisher, r.keyword, r.brand, state.brandTerms, r.clicks, r.bookings, r.cost, r.revenue])), 'Air-France-品牌词规则复核.csv', 'text/csv;charset=utf-8'); return true;
    }
    if (action === 'export-candidates') {
      const rows = candidateRows(filteredRows(state.data.rows, { publisher: state.publisher, query: state.query }), state.minClicks);
      download(csvText(['Source Sheet', 'Source Row', 'Publisher', 'Campaign', 'Keyword', 'Clicks', 'Bookings', 'Cost', 'Rule min clicks'], rows.map(r => [r.sourceSheet, r.sourceRow, r.publisher, r.campaign, r.keyword, r.clicks, r.bookings, r.cost, state.minClicks])), 'Air-France-零预订待核查清单.csv', 'text/csv;charset=utf-8'); return true;
    }
    return false;
  }
  function input(el) {
    let id;
    if (el.dataset.initial) {
      id = el.dataset.initial;
      state.notes[id] = { ...state.notes[id], initial: el.value, attemptHash: null };
    } else if (el.dataset.initialcalc) {
      id = 'q1'; state.notes[id] = { ...state.notes[id], calcs: { ...state.notes[id]?.calcs, [el.dataset.initialcalc]: el.value }, attemptHash: null };
    } else if (el.dataset.answer) {
      id = el.dataset.answer; state.notes[id] = { ...state.notes[id], text: el.value, updatedAt: new Date().toISOString(), datasetHash: hash() || null };
    } else if (el.dataset.evidence) {
      id = el.dataset.evidence; state.notes[id] = { ...state.notes[id], evidence: { ...state.notes[id]?.evidence, [el.dataset.key]: el.value }, datasetHash: hash() || null };
    } else if (el.dataset.budget) {
      id = 'q4'; state.budgets[el.dataset.budget] = el.value === '' ? NaN : Number(el.value);
    } else if (el.id === 'budget-cap') {
      id = 'q4'; state.cap = el.value === '' ? NaN : Number(el.value);
    } else if (['cpc-change', 'cvr-change', 'expansion-drop'].includes(el.id)) {
      id = 'q4'; state[{ 'cpc-change': 'cpcChange', 'cvr-change': 'cvrChange', 'expansion-drop': 'expansionDrop' }[el.id]] = Number(el.value);
      document.querySelector('#' + el.id + '-label').textContent = el.value + '%';
    }
    if (!id) return false;
    invalidate(id); if (save()) updateStatus(id);
    if (id === 'q4' && !el.dataset.answer && !el.dataset.evidence && !el.dataset.initial) updateScenario();
    return true;
  }
  function exportNotes() {
    let text = `# Air France 广告经营调查 · 学员作答\n\n导出时间：${new Date().toLocaleString('zh-CN')}\n\n当前文件：${state.data?.meta.filename || '未导入'}\n\n`;
    for (const l of lessons) {
      const n = state.notes[l.id] || {};
      text += `## ${l.n} ${l.title}\n\n状态：${submitted(l.id) ? '当前数据证据已提交（待讲师评阅）' : '草稿 / 待核对数据'}\n\n### 初判\n\n${n.initial || '未填写'}\n\n`;
      if (n.calcs) text += `独立计算：${Object.entries(n.calcs).map(([k, v]) => k + '=' + v).join('；')}\n\n`;
      text += `### 分析结论\n\n${n.text || '未填写'}\n\n### 三项证据\n\n`;
      for (const [key, label] of assignments[l.id].evidence) text += `- **${label}**：${n.evidence?.[key] || '未填写'}\n\n`;
      if (n.datasetHash) text += `数据 SHA-256：${n.datasetHash}\n\n`;
      for (const [key, title] of [['evidence', '全部证据字段（含保留的旧版记录）'], ['references', '前题引用快照'], ['analysisContext', '分析范围与规则'], ['scenario', '旧版预算情景记录（非本版必答题）']]) if (n[key]) text += `### ${title}\n\n\`\`\`json\n${JSON.stringify(n[key], null, 2)}\n\`\`\`\n\n`;
    }
    download(text, 'Air-France-经营调查作答.md', 'text/markdown;charset=utf-8');
  }
  return { click, input, invalidate, updateScenario, exportNotes, dataLoaded, submitted };
}
