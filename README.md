# 广告增量实验室

基于 Berkeley Haas **Rocket Fuel: Measuring the Effectiveness of Online Advertising（B5894）** 的 120 分钟课程网站。中文题目和参考答案为教学改编，数据使用既有案例的公开镜像，不自行生成经营记录。

本地运行：

```sh
npm run data:download
npm run data:inspect
npm run dev
```

访问 **http://127.0.0.1:4317/**。仅绑定本机，不发布至 Sites。

## 课程

案例故事 → 本节课任务与数据 → 指标体系 → 增量验证 → 经营决策 → 下一轮实验 → 小组答辩。

- 自定义安全公式、统计人群、单位、窗口、指标用途与版本。
- 从原始分组计算转化率和 Newcombe/Wilson 95% 区间；活动后频次/时段仅作探索。
- 案例 CPM/单位贡献与用户敏感性情景分开；经济性使用增量口径。
- 实验设计卡、MDE/样本规划、小组对比、记录导入导出、证据版本与跨题引用。
- 导出文件保存在本机 data/private/exports 的独立目录，生成后可下载；不上传远端。
- Web Worker 本地解析 CSV；原始单元格、物理源行号、筛选分页与明细导出。
- 无数据时方法与答案仍开放，不提供伪造数值。

## 来源和边界

[官方案例](https://store.hbr.org/product/rocket-fuel-measuring-the-effectiveness-of-online-advertising/B5894)；[作者课程](https://faculty.haas.berkeley.edu/zskatona/ewmba206-f21.html)。固定公开数据镜像及 SHA-256 记录于 `dist/assets/case-source.mjs`。镜像未认证为官方文件；案例材料说明部分名称和数值经保密修改。原始、派生明细仅在忽略的 `data/private/`，不提交或打包到 dist。

六列数据支持用户级随机实验，不包含点击、逐笔收入、完整利润或竞价日志；因果解释依赖案例随机分配及完整追踪前提。课程不补造缺失流程数据。

## 保留的 Air France 版本

旧站入口：**http://127.0.0.1:4317/reference/air-france/**。完整旧静态代码、讲义放在 `dist/reference/air-france/`；旧文档放在 `docs/reference-air-france/`。原 SheetJS 在 `dist/vendor/` 共享。旧课程浏览器存储键保持原样，新站使用独立的 `rocket-fuel-course-v1`。

旧数据命令：`npm run legacy:download` / `npm run legacy:inspect`。两套案例不合并。

## 开发与校验

```sh
npm test
npm run check
npm run course:export
```

题目单一来源：`dist/assets/course.mjs`。核心计算：`analytics.mjs`、`investigation.mjs`。`scripts/inspect-rocket.mjs` 从原始 CSV 重算，输出本地审计结果。修改服务端后重启服务；每次交付都实际请求首页和相关资源。

[完整讲义](docs/course-guide.md) · [教师引导](docs/teaching-guide.md)
