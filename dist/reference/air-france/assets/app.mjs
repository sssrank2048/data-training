import { sources, lessons, assignments, courseSchedule } from './course.mjs';
import { caseFile, fieldGroups } from './case-source.mjs';
import { esc } from './charts.mjs';
import { storyEvidence } from './solutions.mjs';

export function datasetIntro(localAvailable, data) {
  return `<section class="panel dataset-intro" aria-labelledby="dataset-title">
    <div class="section-head no-margin"><div><div class="eyebrow">数据导览 / 原始工作簿</div><h2 id="dataset-title">一份完整工作簿，两个分析范围</h2></div><span class="pill ${localAvailable ? 'ready' : 'subtle'}">${localAvailable ? '完整镜像已下载到本机' : '完整镜像可下载'}</span></div>
    <p>Kellogg Air France 案例 KEL319 的配套数据编号为 KEL321。这里准备的是公开仓库中的完整 XLS 副本，保留原表与原始记录，没有生成或补造经营数据。</p>
    <div class="dataset-numbers"><div><strong>4,510</strong><span>DoubleClick 明细记录</span></div><div><strong>7</strong><span>渠道原始标签</span></div><div><strong>24</strong><span>不同活动名称</span></div><div><strong>23</strong><span>主表非空字段</span></div></div>
    <div class="workbook-sheets"><article><span>工作表 01</span><h3>Copyright</h3><p>原工作簿的版权说明，完整保留。</p></article><article><span>工作表 02 · 主分析表</span><h3>DoubleClick</h3><p>关键词投放记录。按渠道 → 活动 → 关键词分析曝光、点击、花费、预订和收入。主表没有日期列。</p></article><article><span>工作表 03 · 独立汇总</span><h3>Kayak</h3><p>2007-06-04 至 06-10 的单周表现。与主表期间未证实一致，第四题单独比较。</p></article></div>
    <div class="dataset-actions">${localAvailable ? `<a class="button primary" href="/__local/${caseFile.filename}" download="${caseFile.filename}">下载完整 Excel · 1.98 MB ↓</a><button class="button" data-action="load-local">载入已下载数据</button>` : `<a class="button primary" href="${caseFile.url}" target="_blank" rel="noopener">下载完整 Excel · 1.98 MB ↗</a><button class="button" data-action="load-mirror">载入公开镜像</button>`}<a class="button quiet" href="#data">字段字典与原表预览 →</a></div>
    <p id="dataset-message" class="small" role="status">${data ? `当前分析文件：${esc(data.meta.filename)}，${data.rows.length.toLocaleString('zh-CN')} 条记录。` : '读取文件后生成图表；数据只在此浏览器处理，不上传。'}</p>
    <details class="provenance-details"><summary>查看文件来源与完整性校验</summary><p>文件 ${caseFile.filename} · ${caseFile.bytes.toLocaleString('zh-CN')} 字节 · ${caseFile.sheets.join(' / ')}。上方规模来自已核验镜像，不代替你导入的其他文件。</p><p>公开镜像未与出版方文件逐字节核对，不能标为“官方认证”。保留 Copyright 表；公开可下载不等于课程分发授权。</p><p><a href="${caseFile.repository}" target="_blank" rel="noopener">查看镜像仓库 ↗</a> · <a href="${sources.data}" target="_blank" rel="noopener">出版方 KEL321 入口 ↗</a></p><div class="file-hash">SHA-256 <code>${caseFile.sha256}</code></div></details>
  </section>`;
}

export function caseStory() {
  return `<section class="case-story" aria-labelledby="story-title"><div class="story-lead"><div class="eyebrow">01 / 案例故事 · 决策的起点</div><h2 id="story-title">Air France 的搜索广告，<br>下一步该怎样投？</h2><div class="story-person">Rob Griffin<small>Media Contacts · 美国搜索业务负责人</small></div></div><div class="story-copy"><p>Air France 通过搜索广告争取在线机票销售，Media Contacts 为其提供营销服务。美国搜索业务负责人 Rob Griffin 面临的任务，是让广告投入更有效地转化为机票销售。</p><p>团队已经在使用多个搜索渠道。接下来的难处是：渠道的点击成本与销售转化表现不同，不能把同一策略机械地用于 Google、MSN、Yahoo；进入渠道内部，活动、关键词和出价策略还需要继续取舍。Kayak 又提供了一个新的渠道比较对象。</p><p>因此，团队需要一套能把经营目标、渠道配置和具体投放动作连起来的分析。下面用配套工作簿说明当前投入与产出为何值得进一步拆解，再依次给出四个问题和参考答案。</p><p class="story-source">业务背景据 <a href="${sources.case}" target="_blank" rel="noopener">Kellogg 官方案例摘要 ↗</a> 概述。课堂分析角色是教学安排；未添加虚构人物、预算或经营事件。</p></div></section>`;
}

export function questionSource(a) {
  return `<div class="case-basis"><span class="eyebrow">案例依据 · 对应讨论主题 ${a.originNumber}</span><p><strong>${a.origin}</strong></p><p>${a.basis}</p><a href="${sources.case}" target="_blank" rel="noopener">官方学习目标 ↗</a> · <a href="${sources.questions}" target="_blank" rel="noopener">四项讨论主题出处（课程大纲转载）↗</a><p class="small">题干为中文重述；分析步骤、时间和评分为本课上机安排，不是官方原题逐字译文或标准答案。</p></div>`;
}

export function sourceMapping() {
  return `<section class="panel"><h2>四题与实际案例怎样对应</h2><p>题目依据官方案例学习目标，以及 Brandeis BUS 257f 课程大纲转载中列出的四项 Air France 讨论主题。为便于上机，先做指标题，再做渠道、活动和未来 SEM；没有新增虚构经营情节。</p><div class="table-scroll"><table><caption>本课顺序 → 参考讨论主题</caption><thead><tr><th>本课四题</th><th>对应主题</th><th>本课可视化</th></tr></thead><tbody>${lessons.map((l,i)=>`<tr><th><a href="#${l.id}">${l.n} ${l.title}</a></th><td>第 ${assignments[l.id].originNumber} 项：${assignments[l.id].origin}</td><td>${['指标卡与投放路径','CPC–CVR 四象限与渠道规模','活动花费、策略比较与源行明细','Kayak 独立指标与渠道效率参照'][i]}</td></tr>`).join('')}</tbody></table></div><p class="small"><a href="${sources.questions}" target="_blank" rel="noopener">查看大纲转载中的 Air France 章节 ↗</a>（第三方转载，未找到学校当前托管原件） · <a href="${sources.nyu}" target="_blank" rel="noopener">NYU Stern 官方课程大纲 ↗</a> 用于核实该案例的课程采用情况，不作为四题逐字来源。</p></section>`;
}

export function fieldDictionary() {
  return `<section class="panel"><h2>数据里有什么</h2><div class="table-scroll"><table><caption>已核验镜像的 23 个非空主表字段，按分析用途分组</caption><thead><tr><th>用途</th><th>原始字段</th><th>怎样使用</th></tr></thead><tbody>${fieldGroups.map(([a,b,c])=>`<tr><th>${a}</th><td class="prose-cell">${b}</td><td class="prose-cell">${c}</td></tr>`).join('')}</tbody></table></div><p class="small">一行是原表的一条关键词投放记录，不是一个用户、一次点击或一天。24 个活动名称分布在 45 个“渠道 + 活动”组合中。DoubleClick 是工作表名称，不能当成一个渠道与 Google 相加。</p><div class="notice info"><p>没有日期序列、广告文案、落地页、用户路径、退款、机票成本或实验分组。本课覆盖搜索广告的目标评价 → 渠道配置 → 投放优化 → 未来方案与复盘；不把缺失环节伪装成完整观测。</p></div></section>`;
}

export function overview(localAvailable, data) {
  return `<div class="page-head"><div><div class="eyebrow">AIR FRANCE / 搜索广告经营案例</div><h1>广告已经在投，下一步该怎么选？</h1><p>从真实的业务处境出发，沿着数据、问题与解答，完成一份有证据的 SEM 建议。</p></div><div class="head-meta">120 MIN<br>案例故事 → 问题与解答</div></div>${caseStory()}${storyEvidence(data,localAvailable)}<section class="panel learning-road"><div class="section-head"><div><div class="eyebrow">02 / 先看原表，再进入四题</div><h2>这堂课怎样展开</h2></div><a class="button primary" href="#data">查看原始明细 →</a></div><p>已准备完整工作簿。问题、参考答案与推导同时开放；你也可以在“练习与作答”中保存独立初判、记录证据。</p><div class="course-timeline">${courseSchedule.map(([time,title,goal])=>`<div><span>${time}</span><strong>${title}</strong><small>${goal}</small></div>`).join('')}</div><p class="small">数据源：${data?esc(data.meta.filename):'Air France 公开工作簿镜像'}。镜像未与出版方文件逐字节核验；原件、工作表与字段可在数据页检查。</p></section><section class="question-overview"><div class="section-head"><div><div class="eyebrow">03 / 四个问题，四段完整解题过程</div><h2>从指标到投放方案</h2></div><a class="button compact" href="/reference/air-france/downloads/course-guide.md" download>下载问题与解题指南 ↓</a></div><div class="lesson-grid">${lessons.map(l=>`<article class="lesson"><div class="lesson-top"><span class="lesson-number">${l.n}</span><span class="lesson-time">${l.time} 分钟</span></div><div class="lesson-tag">${l.tag} · 参考主题 ${assignments[l.id].originNumber}</div><h3><a href="#${l.id}">${l.title}</a></h3><p>${l.desc}</p><div class="lesson-bottom"><span>${l.output}</span><a href="#${l.id}">问题与完整解答 ↗</a></div></article>`).join('')}</div></section><a class="button quiet" href="#brief">查看案例依据与四题来源 →</a>`;
}
