import fs from 'node:fs';
import {courseTitle,story,lessons,courseSchedule,sources} from '../dist/assets/course.mjs';
import {caseFile,fieldDictionary} from '../dist/assets/case-source.mjs';
const chunks=[`# ${courseTitle}\n\nRocket Fuel 广告增量实验课程 · 120 分钟\n\n四题为基于 Berkeley Haas B5894 的教学改编；参考答案与可视化由本课方法和当前 CSV 计算产生，不是出版方标准答案。`,
`## 案例故事\n\n${story.intro}\n\n${story.dilemma}\n\n${story.context}`,
`## 数据身份\n\n官方案例确认同名配套 CSV；本机文件使用公开镜像，未与官方文件逐字节认证。\n\n文件 ${caseFile.filename}，${caseFile.bytes} 字节，${caseFile.rows} 行。\n\nSHA-256：${caseFile.sha256}\n\n[固定数据镜像](${sources.dataMirror})\n\n原始与派生明细仅保留本机 data/private；本讲义不嵌入明细。`,
`## 课程顺序\n\n${courseSchedule.map(([t,n,a])=>`- ${t}：${n}；${a}。`).join('\n')}`,
`## 字段口径\n\n${fieldDictionary.map(([f,n,b,t])=>`- ${f}（${n}，${t}）：${b}`).join('\n')}`];
for(const l of lessons)chunks.push(`## ${l.n} ${l.title}（${l.time} 分钟）\n\n**问题：${l.question}**\n\n${l.context}\n\n案例依据：${l.origin}\n\n${l.tasks.map(([t,b],i)=>`${i+1}. **${t}**：${b}`).join('\n\n')}\n\n交付：${l.deliverable}\n\n### 完整参考答案\n\n${l.answer}\n\n${l.steps.map(([t,b],i)=>`${i+1}. **${t}**：${b}`).join('\n\n')}\n\n结论边界：${l.boundary}\n\n证据提交：${l.evidence}\n\n进阶追问：${l.challenge}\n\n数值答案与可视化：打开本地课程 #${l.id}，读取完整数据后查看。无数据时不生成示例结果。`);
chunks.push(`## 材料与方法来源\n\n${Object.entries(sources).map(([k,v])=>`- [${k}](${v})`).join('\n')}\n\n旧版独立入口：http://127.0.0.1:4317/reference/air-france/`);
const output=chunks.join('\n\n');fs.mkdirSync('dist/downloads',{recursive:true});fs.writeFileSync('docs/course-guide.md',output);fs.writeFileSync('dist/downloads/course-guide.md',output);fs.copyFileSync('docs/teaching-guide.md','dist/downloads/teaching-guide.md');console.log('Exported all four questions, worked methods and teaching guide.');
