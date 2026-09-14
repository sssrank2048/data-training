import fs from 'node:fs';
import {lessons,assignments,metricDefinitions,sources} from '../dist/assets/course.mjs';
let out='# Air France 广告经营分析实战 · 上机题目\n\n面向产品、运营及有分析基础的学员。总时长 120 分钟，10 分钟导入 + 110 分钟练习；不要求机器学习。\n\n题目为独立教学改编，非官方原题或标准答案。数据使用 Air France KEL321 配套表格；本仓库不公开分发原版材料。\n\n';
for(const l of lessons){const a=assignments[l.id];out+=`## ${l.n} ${l.title}（${l.time} 分钟 / 25 分）\n\n${a.question}\n\n${a.context}\n\n`;a.tasks.forEach(([title,body],i)=>out+=`${i+1}. **${title}**：${body}\n\n`);out+=`交付：${a.deliverable}\n\n提示：${a.hint}\n\n评阅依据：${a.rubric.join('；')}。\n\n`;}
out+='## 指标口径\n\n'+metricDefinitions.map(m=>`- **${m[0]}**：${m[2]}（${m[3]}）。${m[4]}`).join('\n')+'\n\n## 材料来源\n\n'+Object.entries(sources).map(([k,v])=>`- [${k}](${v})`).join('\n')+'\n';
fs.mkdirSync('dist/downloads',{recursive:true});fs.writeFileSync('dist/downloads/course-guide.md',out);fs.writeFileSync('docs/course-guide.md',out);console.log('Exported course guide from canonical course definitions.');
