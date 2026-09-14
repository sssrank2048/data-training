# Air France 广告经营分析课程

基于 Kellogg Air France（KEL319 / KEL321）的 120 分钟上机课。网站先介绍并提供完整数据下载，再讲述官方摘要中的业务背景，最后进入四道有来源的题目：KPI、渠道策略、活动与关键词优化、未来 SEM 与 Kayak。

## 开始使用

- 本地服务：`npm run dev`，打开 http://127.0.0.1:4317/。
- 完整 Excel 已放在 `data/private/air-france-mirror.xls`。首页可直接下载或载入；新环境先执行 `npm run data:download`，再运行 `npm run data:inspect`。
- 镜像含 Copyright / DoubleClick / Kayak；4,510 条主表记录，7 个渠道，24 个活动名称。下载脚本校验 1,975,296 字节与 SHA-256，不覆盖不同文件、不创建模拟数据。
- 来源是公开仓库镜像，尚未与出版方原件逐字节核对。官网数据附件与正文入口均保留，未重发完整案例正文。
- 部署页可下载或从公开仓库读取镜像；本机和导入文件均在浏览器处理，不上传。原始及派生明细不进入 Git 或网站包。

## 题目与文档

`dist/assets/course.mjs` 是四题唯一维护入口，修改后运行 `node scripts/export-course.mjs` 同步可下载题目。每题包含业务介绍、来源、数据字段、分析步骤、交付、评分和讲评。

- [案例事实与题目对照](docs/case-alignment.md)
- [完整上机题目](docs/course-guide.md)
- [讲师指南与时间安排](docs/teaching-guide.md)
- [数据来源和文件校验](docs/data-provenance.md)
- [分析方法与边界](docs/analysis-methods.md)

四题对应参考讨论主题 3、1、2、4；中文重述及上机安排由本课编写，不声称为官方原题或标准答案。没有文案、日期序列、机票成本、对照实验等字段时，不补造这些记录或对应结论。

## 代码与验证

纯静态 HTML / CSS / JS，SheetJS 在浏览器读取工作簿。`npm test` 检验计算与关键行为，`npm run check` 检查静态资源和原始数据分发边界。原数据只由本地 127.0.0.1 服务的白名单路径提供。

作答保存在当前浏览器，可导出 Markdown。保留独立初判、逐题证据和跨题引用；不同文件或修订前题后需重新提交。课程更新保留旧文字与证据导出。
