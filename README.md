# 广告增量实验室

基于 Berkeley Haas **Rocket Fuel: Measuring the Effectiveness of Online Advertising（B5894）** 的 120 分钟课程网站。中文题目和参考答案为教学改编，数据使用既有案例的公开镜像，不自行生成经营记录。

本地运行（Node.js 20 或更高版本）：

```sh
npm start
```

访问 **http://127.0.0.1:4317/**。仅绑定本机，不发布至 Sites。

首次启动会从固定公开镜像下载完整 CSV 到 `data/private`，核验文件长度和 SHA-256 后使用；已有正确文件直接复用。`npm run dev` 同样会准备数据。直连使用 Node；检测到代理环境变量时使用系统 curl，支持 HTTP / HTTPS / SOCKS 代理及 NO_PROXY。无需 unzip 或额外 npm 依赖。

**换环境时数据不会随 Git 或 dist 一起带过去。** 拉取完整项目后运行上面的命令即可准备主案例数据。网络受限时，可先用 `npm run serve` 启动，在“数据与原始明细”页从镜像加载或手动导入。仅有 dist 的静态环境没有本地数据端点，需要使用这两个入口；浏览器加载的 CSV 不会写入服务器，刷新后需重新加载。

单独准备与检查：`npm run data:download` → `npm run data:check` → `npm run data:inspect`。下载失败不会写入半成品；已有文件不匹配时保留原文件，先核对并重命名备份再重试。详见 [换环境运行与数据准备](docs/environment-setup.md)。

**代理环境出现 `fetch failed`：** 更新代码后，已设置的 `HTTPS_PROXY` / `https_proxy` 或 `ALL_PROXY` / `all_proxy` 会自动用于下载。若只开启了系统或浏览器代理，需要在终端显式指定。例如 macOS / Linux：`COURSE_DATA_PROXY="http://127.0.0.1:7890" npm run data:download`（地址和端口替换为实际代理，7890 仅为示例）。代理模式需要 `curl --version` 可用；完整配置及 Windows 命令见[代理环境说明](docs/environment-setup.md#代理环境与-fetch-failed)。

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
