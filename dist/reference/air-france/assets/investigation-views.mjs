import { lessons, assignments } from './course.mjs';
import { aggregate, groupRows, filteredRows, divide } from './analytics.mjs';
import { esc, num, usd, pct, bars } from './charts.mjs';
import { mixComparison, classifiedRows, decomposeCPA, thresholdSensitivity, candidateRows, comparePlans, allocateBudget, isSubmitted, COURSE_REVISION } from './investigation.mjs';

const options = (groups, value) => groups.map(g => `<option value="${esc(g.name)}" ${g.name === value ? 'selected' : ''}>${esc(g.name)}</option>`).join('');
const table = (caption, headers, rows) => `<div class="table-scroll"><table><caption>${caption}</caption><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((v, i) => i === 0 ? `<th scope="row">${v}</th>` : `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const signed = n => n === null ? '—' : `${n >= 0 ? '+' : '−'}${usd(Math.abs(n), 2)}`;

export function investigationViews(state) {
  const hash = () => state.data?.meta.sha256;
  const submitted = id => isSubmitted(state.notes[id], hash());
  const attempted = id => !!(hash() && state.notes[id]?.attemptHash === hash() && state.notes[id]?.initial?.trim());
  const missingPrior = () => lessons.slice(0, 3).filter(l => !submitted(l.id));

  function initial(id) {
    const n = state.notes[id] || {}, a = assignments[id];
    return `<section class="panel initial-panel"><div class="eyebrow">练习记录 · 可选</div><h2>${attempted(id) ? '已保存的初判' : '记录你的初判与验证方法'}</h2><label class="answer-prompt" for="initial-${id}">${a.hypothesis}</label><textarea id="initial-${id}" data-initial="${id}" rows="3" placeholder="写下你的初步判断和验证方法。它可以是错的。">${esc(n.initial || '')}</textarea>${id === 'q1' ? `<div class="initial-calcs">${[['cpc', 'CPC（USD / click）'], ['cpa', 'CPA（USD / booking）'], ['roas', 'ROAS（倍）']].map(([key, label]) => `<label>${label}<input type="number" min="0" step="any" data-initialcalc="${key}" value="${esc(n.calcs?.[key] ?? '')}" placeholder="先独立计算"></label>`).join('')}</div><p class="small">先用原始文件独立核算这三个指标。允许计算错误，保存后再逐项核对。</p>` : ''}<div class="answer-footer"><span class="small">本地学习记录，不向讲师自动提交。</span><button class="button primary" data-action="save-initial" data-id="${id}">保存初判，进入分析 →</button></div></section>`;
  }
  function chain() {
    return `<section class="panel"><div class="eyebrow">贯穿四题的证据</div><h2>这份方案依据什么</h2><div class="evidence-chain">${lessons.slice(0, 3).map(l => `<article><a href="#${l.id}">${l.n} ${l.title}</a><span class="pill ${submitted(l.id) ? 'ready' : 'subtle'}">${submitted(l.id) ? '当前数据 · 已提交' : '待补齐或重新提交'}</span><p>${esc(state.notes[l.id]?.evidence?.[assignments[l.id].evidence.at(-1)[0]] || '先完成本题证据，后续方案才能引用。')}</p></article>`).join('')}</div><p class="small">更换数据或修改前题证据后，需要重新提交后续结论。已有作答文字保留。</p></section>`;
  }
  function gate() { return null; }
  function note(id) {
    const n = state.notes[id] || {}, a = assignments[id];
    return `<section class="panel answer-panel"><div class="section-head no-margin"><h2>提交可检查的结论</h2><span>自动保存到此浏览器</span></div>${n.courseRevision && n.courseRevision !== COURSE_REVISION ? '<div class="notice"><p>四题已按案例主题更新，旧作答文字保留。请核对新题意并重新提交。导出记录会包含旧证据字段。</p></div>' : ''}${n.datasetHash && n.datasetHash !== hash() ? '<div class="notice"><p>这份作答来自另一份数据。文字已保留，请核对后重新提交。</p></div>' : ''}<label for="answer-${id}" class="answer-prompt">${a.prompt}</label><textarea id="answer-${id}" data-answer="${id}" rows="7" placeholder="初判如何改变：\n支持证据：\n建议动作：\n不确定性和验证：">${esc(n.text || '')}</textarea><div class="evidence-fields">${a.evidence.map(([key, label]) => `<label>${label}<textarea rows="2" data-evidence="${id}" data-key="${key}" placeholder="写明数值、范围与依据">${esc(n.evidence?.[key] || '')}</textarea></label>`).join('')}</div><div class="notice info"><p>${a.handoff}</p></div><div class="answer-footer"><span class="small" id="save-status">${submitted(id) ? '练习证据已提交。修改后需要重新提交。' : '草稿会自动保存；提交前请填写结论与三项证据。'}</span><button class="button primary" data-action="complete" data-id="${id}">${submitted(id) ? '✓ 已提交 · 撤回提交' : '提交本题证据'}</button></div></section>`;
  }
  function audit() {
    const data = state.data, t = aggregate(data.rows), calcs = state.notes.q1?.calcs || {};
    const rows = data.rows.filter(r => r.clicks === 0 || r.bookings > r.clicks);
    return `<section class="panel"><h2>独立计算与复核结果</h2>${table('保存初判时的计算值；差异不自动判定经营结论', ['指标', '你的计算', '当前文件复算'], [['CPC', esc(calcs.cpc), num(t.cpc, 4)], ['CPA', esc(calcs.cpa), num(t.cpa, 4)], ['ROAS', esc(calcs.roas), num(t.roas, 4)]])}</section><section class="panel"><h2>回到异常源行核查</h2>${table('零点击或预订高于点击的全部记录', ['源行', '关键词', '点击', '预订', '花费'], rows.map(r => [r.sourceRow, esc(r.keyword), num(r.clicks), num(r.bookings), usd(r.cost, 2)]))}<p class="chart-caption">异常保留。记录处理判断与依据，不默认删除。</p></section>`;
  }
  function mix() {
    const groups = groupRows(state.data.rows, 'publisher');
    if (!groups.some(g => g.name === state.mixA)) state.mixA = groups[0]?.name;
    if (!groups.some(g => g.name === state.mixB) || state.mixB === state.mixA) state.mixB = groups.find(g => g.name !== state.mixA)?.name || state.mixA;
    const result = mixComparison(state.data.rows, state.mixA, state.mixB, state.brandTerms);
    const classified = classifiedRows(state.data.rows.filter(r => [state.mixA, state.mixB].includes(r.publisher)), state.brandTerms);
    const review = ['品牌命中', '非品牌候选'].flatMap(k => classified.filter(r => r.brand === k).sort((a, b) => b.cost - a.cost).slice(0, 4));
    const max = Math.max(.001, ...result.channels.flatMap(c => [c.raw.cvr || 0, c.adjusted.cvr || 0]));
    return `<section class="panel"><div class="eyebrow">验证初判 / 分层比较</div><h2>把关键词结构放到同一尺度</h2><div class="filters"><label>比较渠道 A<select id="mix-a">${options(groups, state.mixA)}</select></label><label>比较渠道 B<select id="mix-b">${options(groups, state.mixB)}</select></label></div><label class="field-label" for="brand-terms">品牌词组规则（逗号分隔，可修改）</label><div class="rule-controls"><input id="brand-terms" value="${esc(state.brandTerms)}"><button class="button primary" data-action="apply-mix">应用规则与渠道</button></div><p class="small">统一大小写、空格和标点后按完整词组匹配，不自动纠正拼写。分类是分析规则，未命中仅标为“非品牌候选”。</p>${result.valid ? `${table('两渠道分层汇总；缺失分层不补零', ['渠道 / 分层', '点击', '预订', 'CVR', 'CPC', 'ROAS'], result.channels.flatMap(c => Object.values(c.strata).map(s => [esc(c.name + ' / ' + s.name), num(s.clicks), num(s.bookings), pct(s.cvr), usd(s.cpc, 2), num(s.roas, 2) + '×'])))}<h3 class="subsection-title">原始与共同结构下的 CVR</h3><div class="paired-bars" role="img" aria-label="两渠道原始与标准化预订率对比">${result.channels.map(c => `<div class="paired-group"><strong>${esc(c.name)}</strong>${[['原始', c.raw.cvr], ['标准化', c.adjusted.cvr]].map(([label, value], i) => `<div><span>${label}</span><div class="paired-track"><i class="${i ? 'adjusted' : ''}" style="width:${(value || 0) / max * 100}%"></i></div><b>${pct(value)}</b></div>`).join('')}</div>`).join('')}</div><p class="chart-caption">横条共同从 0 起，长度表示 CVR。权重来自两渠道共同分层合并后的点击占比：${Object.entries(result.weights).map(([k, w]) => `${k} ${pct(w)}`).join('；')}。</p>${table('标准化仅控制当前品牌词分类，不能推断因果或新增流量回报', ['渠道', '共同分层点击覆盖率', '原始 CPC → 标准化', '原始 ROAS → 标准化'], result.channels.map(c => [esc(c.name), pct(c.coverage), `${usd(c.raw.cpc, 2)} → ${usd(c.adjusted.cpc, 2)}`, `${num(c.raw.roas, 2)} → ${num(c.adjusted.roas, 2)}`]))}` : '<div class="notice"><p>请选择两个不同渠道，并确认至少一个分层在两渠道都有点击。缺少共同覆盖时不计算标准化结果。</p></div>'}<details class="hint"><summary>标准化如何计算</summary><p>CVR = Σ共同点击权重 × 各层预订/点击；CPC 同样按点击权重求和。ROAS = 标准化收入/点击 ÷ 标准化花费/点击。缺失关键词和无共同覆盖的层排除，并报告覆盖率。</p></details><div class="section-head"><h3>人工复核分类</h3><button class="button compact" data-action="export-classification">导出两渠道全部分类 ↓</button></div>${table('按花费选取各类前 4 行；请自行补充边界词核查', ['源行', '关键词', '渠道', '规则分类'], review.map(r => [r.sourceRow, esc(r.keyword), esc(r.publisher), r.brand]))}</section>`;
  }
  function diagnostic() {
    const rows = filteredRows(state.data.rows, { publisher: state.publisher });
    const campaigns = groupRows(rows.map(r => ({ ...r, scopeCampaign: `${r.publisher} / ${r.campaign}` })), 'scopeCampaign');
    if (!campaigns.some(c => c.name === state.decompA)) state.decompA = campaigns[0]?.name;
    if (!campaigns.some(c => c.name === state.decompB) || state.decompB === state.decompA) state.decompB = campaigns.find(c => c.name !== state.decompA)?.name || state.decompA;
    const a = campaigns.find(c => c.name === state.decompA), b = campaigns.find(c => c.name === state.decompB), d = a && b ? decomposeCPA(a, b) : null;
    const scope = filteredRows(rows, { query: state.query }), sensitivity = thresholdSensitivity(scope, state.minClicks);
    return `<section class="panel"><div class="eyebrow">数学分解 / 不是因果归因</div><h2>CPA 差异由什么构成</h2><div class="filters"><label>待诊断活动 A<select id="decomp-a">${options(campaigns, state.decompA)}</select></label><label>参照活动 B<select id="decomp-b">${options(campaigns, state.decompB)}</select></label><button class="button" data-action="apply-decomposition">比较活动</button></div>${d && a.name !== b.name ? `<div class="decomposition"><div><span>B 的 CPA</span><strong>${usd(d.from, 2)}</strong></div><div><span>点击成本贡献</span><strong>${signed(d.costContribution)}</strong></div><div><span>预订率贡献</span><strong>${signed(d.conversionContribution)}</strong></div><div><span>A 的 CPA</span><strong>${usd(d.to, 2)}</strong></div></div><p class="chart-caption">A − B = ${signed(d.delta)} / booking。两项贡献相加等于差额；正值推高 A 的 CPA，负值降低。使用完整精度计算，显示到美分。</p>${table('用于复算的活动指标', ['活动', '点击', '预订', 'CPC', 'CVR', 'CPA'], [a, b].map(c => [esc(c.name), num(c.clicks), num(c.bookings), usd(c.cpc, 4), pct(c.cvr), usd(c.cpa, 4)]))}` : '<div class="notice"><p>请选择两个不同活动。零点击、零预订或零 CPC 时，本分解不可用；不要把不可计算值填为零。</p></div>'}<details class="hint"><summary>查看可复算公式</summary><p>令 C = CPC，V = 1/CVR。点击成本贡献 = (C_A−C_B) × (V_A+V_B)/2；预订率贡献 = (V_A−V_B) × (C_A+C_B)/2。对两种替换顺序取平均，二者之和等于 CPA_A−CPA_B。</p></details></section><section class="panel"><div class="eyebrow">稳健性 / 教学筛选规则</div><h2>换一个点击门槛，清单还稳定吗</h2><p>范围：${esc(state.publisher || '全部渠道')}；关键词包含“${esc(state.query || '不限')}”。候选规则：零预订且点击 ≥ 门槛。当前参照门槛 ${state.minClicks}，并非显著性标准。</p>${bars(sensitivity.map(s => ({ name: `≥ ${s.threshold} 次点击`, cost: s.cost })), { title: '候选花费', limit: 8 })}${table('前十项按花费排序；重合数相对当前门槛的前十项', ['点击门槛', '候选记录', '涉及花费', '占所选范围花费', '前十项重合'], sensitivity.map(s => [s.threshold, num(s.count), usd(s.cost, 2), pct(s.share), `${s.overlap} / ${s.referenceCount}`]))}<div class="notice info"><p>这里展示的是待核查投入，不能直接称为浪费、可节省金额或真实低转化概率。</p></div><button class="button" data-action="export-candidates">导出当前门槛的零预订候选 ↓</button></section>`;
  }
  function budgetResults() {
    const groups = groupRows(state.data.rows, 'publisher');
    const opts = { cap: state.cap, cpcChange: state.cpcChange, cvrChange: state.cvrChange, expansionDrop: state.expansionDrop };
    const plans = comparePlans(groups, state.budgets, opts), own = plans[2].result, base = plans[0].result;
    const equalBudget = Math.abs(own.budget - state.cap) <= .005;
    const rows = plans.map(p => [p.name, usd(p.result?.budget, 2), usd(p.result?.baseRevenue, 2), usd(p.result?.revenue, 2), p.result?.revenue === null || !p.result ? '—' : signed(p.result.revenue - base.revenue)]);
    const neutralPlans = comparePlans(groups, state.budgets, { ...opts, expansionDrop: 0 });
    const unpenalized = neutralPlans[2].result, edge = unpenalized.revenue === null ? null : unpenalized.revenue - neutralPlans[0].result.revenue;
    const threshold = edge !== null && edge > 0 && unpenalized.expansionRevenue > 0 ? edge / unpenalized.expansionRevenue : null;
    const boundary = !equalBudget ? '先分配完同一预算，再讨论相对优势失效点。' : edge === null ? '历史效率不足，无法计算失效点。' : edge <= 0 ? '即使新增分配部分不折损，当前方案也未超过历史占比方案。' : threshold !== null && threshold <= 1 ? `新增分配部分的 CVR 折损约 ${pct(threshold)} 时，当前方案与历史占比方案的收入相等。` : '在本模型 0%–100% 的新增部分 CVR 折损范围内，没有发现优势失效点。';
    return `<div class="comparison-wrap">${table('三个方案采用相同历史效率口径；金额均为 USD', ['分配方案', '已分配', '历史效率收入', '压力情景收入', '相对历史占比方案'], rows)}</div><div class="result-list"><div><span>我的方案 · 情景预订</span><strong>${num(own.bookings, 1)}</strong></div><div><span>我的方案 · 广告费后余额（非利润）</span><strong>${usd(own.balance, 2)}</strong></div></div>${!equalBudget ? `<div class="notice"><p>${own.budget > state.cap ? '超过' : '尚未分配'}预算 ${usd(Math.abs(own.budget - state.cap), 2)}。本题要求同预算比较，分配完成后才能保存。</p></div>` : ''}${!own.valid ? '<div class="notice"><p>存在无法估算历史效率的渠道，结果不可计算。</p></div>' : ''}<div class="notice info"><p>${boundary} 这是固定效率模型下的敏感性边界，不是预测或置信区间。</p></div><details><summary>查看三方案各渠道预算</summary>${table('各渠道预算均显示至美分', ['渠道', ...plans.map(p => p.name)], groups.map(g => [esc(g.name), ...plans.map(p => usd(p.budgets?.[g.name], 2))]))}</details><button class="button primary" data-action="save-scenario" ${!equalBudget || !own.valid ? 'disabled' : ''}>保存三方案与压力测试</button><p class="small">保存后若调整预算或假设，需要重新保存，最终提交才会引用最新版本。</p>`;
  }
  function reference(id) {
    return `<section class="panel"><div class="eyebrow">讲评 / 非官方标准答案</div><h2>用问题检验你的结论</h2><p>${assignments[id].challenge}</p><div class="two-columns"><div><h3>你的初判</h3><p class="preserve-lines">${esc(state.notes[id]?.initial || '')}</p></div><div><h3>你的修正结论</h3><p class="preserve-lines">${esc(state.notes[id]?.text || '')}</p></div></div><details class="hint"><summary>检查本题的关键推理</summary><p>${assignments[id].hint}</p><p>${assignments[id].handoff}</p></details></section>`;
  }
  return { initial, note, chain, gate, attempted, submitted, audit, mix, diagnostic, budgetResults, reference };
}
