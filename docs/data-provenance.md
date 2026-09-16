# Rocket Fuel 数据来源与核验

主案例：Berkeley Haas **Rocket Fuel: Measuring the Effectiveness of Online Advertising**，B5894，Zsolt Katona / Brian Bell，2017。

- [官方简介](https://store.hbr.org/product/rocket-fuel-measuring-the-effectiveness-of-online-advertising/B5894)：确认商业广告 vs PSA、Cookie 用户随机分配以及配套 rocketfuel_data.csv。
- [作者课程大纲](https://faculty.haas.berkeley.edu/zskatona/ewmba206-f21.html)：Marketing Core / Fall 2021，列有 Rocket Fuel 小组案例分析。
- [正文公开镜像](https://pdfcoffee.com/rocket-fuel-measuring-the-effectiveness-of-online-advertising-pdf-free.html)：核对原题 1–4 的主题、六个字段、活动期、4% 对照、CPM $9 与单位贡献约 $40。部分名称和数值为保密修改，不将其描述为未加工真实生产数据。不分发全文。
- [采用的数据镜像固定版本](https://github.com/OguzhanCetinkaya/rocketfuel/blob/b2d2b779bd38dd7813623e25786d53fcb7012005/rocketfuel_data.csv)：公开教学分析仓库，不自动认证为官方文件。

文件保存：`data/private/rocketfuel_data.csv`。

字节数：12,024,311；SHA-256：`5e2325b50ed34283a38b011f12323609bbf6554236c17632c84cd3a6866097a2`；Git blob SHA-1：`07c1827ee0c10e498fc69c667b66bec711eca31e`。

从该版本的 GitHub 归档提取唯一同名 CSV，并核对 blob 身份。不修改内容，不执行镜像仓库代码。头部 BOM 在解析字段名时处理；原 CSV 下载原样保留。

## 使用前检查

588,101 条用户记录、六列、无重复用户或缺失单元格。商业组 564,577 用户，PSA 23,524 用户。原始物理行号包含表头，明细导出加 source_row 供追溯。

`npm run data:inspect` 从原文件重算，在忽略的 data/private 中保存审计、分组汇总、切片和推断。静态 dist 中不嵌入原始或派生明细。

## 拒用的初始镜像

[fahad-213/rocketfuel_data 固定版本](https://github.com/fahad-213/rocketfuel_data/blob/ffb716d8965e1847aed5826cffd8d47a8cb2ed6c/rocketfuel_data.csv) 虽可完整下载、符合 Git blob 身份，但实际 588,048 行，检查到 9 个重复用户。该版本保留在本机 `data/private/rocketfuel-fahad-mirror-audit.csv`，没有补行或自行去重，未作为课程默认数据。

其 SHA-256：`7021dc2645815808f618507d85781f01841b4890eff84fb8755c6dd608ecbbf2`。这说明镜像完整下载与数据适用性是两件不同的事；文件身份核验不能替代质量审计。

## 边界

只有案例描述提供随机化依据，CSV 不包含完整随机化日志、跨设备关系、预处理画像或失访。频次与主要曝光星期/小时是投放后变量，不能据此认定策略因果效果。没有点击、金额、订单或退款字段。

CPM 与单位贡献是案例参数，不是 CSV 实测列。调整后的参数是学员情景；未来实验的 MDE、分流比例和流量属于计划，不是已发生数据。

旧 Air France 来源记录保存在 `docs/reference-air-france/data-provenance.md`，独立使用。
