import fs from 'node:fs';
import {lessons,assignments,metricDefinitions,sources} from '../dist/assets/course.mjs';
import {caseFile} from '../dist/assets/case-source.mjs';
let out='# Air France 广告经营分析实战 · 上机题目\n\n面向产品、运营及有分析基础的学员。总时长 120 分钟，10 分钟导入 + 100 分钟调查 + 10 分钟讲评；不要求机器学习。\n\n四题对应实际案例的 KPI、渠道策略、活动与关键词、未来 SEM 与 Kayak 四项讨论主题。按学习顺序调整为参考主题 3、1、2、4；中文重述及上机步骤为本课安排，非官方原题逐字译文或标准答案。\n\n';
out+=`## 数据与来源\n\n[完整 Excel 镜像](${caseFile.url}) · ${caseFile.bytes} 字节 · Copyright / DoubleClick / Kayak。DoubleClick 有 ${caseFile.rows} 条记录、${caseFile.publishers} 个渠道、${caseFile.campaigns} 个活动名称。镜像未与官方文件逐字节核验。SHA-256：${caseFile.sha256}。\n\n## 业务引子\n\nMedia Contacts 的 Rob Griffin 要帮助 Air France 改善搜索广告的在线机票销售表现，面对跨渠道投入、关键词和出价策略的选择。课程围绕官方摘要所描述的决策展开，并以 Kayak 讨论未来渠道机会。\n\n`;
for(const l of lessons){const a=assignments[l.id];out+=`## ${l.n} ${l.title}（${l.time} 分钟 / 25 分）\n\n${a.question}\n\n${a.context}\n\n案例依据（参考主题 ${a.originNumber}）：${a.origin} ${a.basis}\n\n涉及数据：${a.fields.join('、')}。\n\n`;a.tasks.forEach(([title,body],i)=>out+=`${i+1}. **${title}**：${body}\n\n`);out+=`初判（看结果前填写）：${a.hypothesis}\n\n交付：${a.deliverable}\n\n提示：${a.hint}\n\n评阅依据：${a.rubric.join('；')}。\n\n必交证据：${a.evidence.map(x=>x[1]).join('；')}。\n\n跨题引用：${a.handoff}\n\n进阶追问：${a.challenge}\n\n`;}
out+='## 指标口径\n\n'+metricDefinitions.map(m=>`- **${m[0]}**：${m[2]}（${m[3]}）。${m[4]}`).join('\n')+'\n\n## 材料来源\n\n'+Object.entries(sources).map(([k,v])=>`- [${k}](${v})`).join('\n')+'\n';
fs.mkdirSync('dist/downloads',{recursive:true});fs.writeFileSync('dist/downloads/course-guide.md',out);fs.writeFileSync('docs/course-guide.md',out);console.log('Exported course guide from canonical course definitions.');

fs.copyFileSync('docs/teaching-guide.md','dist/downloads/teaching-guide.md');
