# Air France 数据来源与核验记录

检查日期：2026-09-14。

## 来源层级

1. 案例身份：[Kellogg 官方页面](https://www.kellogg.northwestern.edu/academics-research/research/detail/2009/airfranceinternetmarketingoptimizinggoogleyahoomsnand/)，正文 KEL319。
2. 正式数据附件入口：[Harvard Business Publishing，KEL321-XLS-ENG](https://hbsp.harvard.edu/product/KEL321-XLS-ENG)。本次未从发行方取得官方文件。
3. 当前开发文件：[公开课程仓库中的 Excel 镜像](https://github.com/fairypp/Air_France_Internet_Marketing/blob/master/Air%20France%20Internet%20Marketing.xls)。它是现有文件，不是生成或编造的数据；但镜像的内容完整性尚未通过官方逐项对照验证。

文件大小 1,975,296 字节。SHA-256：

`c1e71191caacb17a4ee14815803a65d9f39bb27cfc07ed5f7f0c243e7ca78a0c`

指纹用于确认文件未发生变化，不能证明其官方来源或使用许可。原文件仅保留在被忽略的本地目录，不随网站发布。正式教学请取得相应材料使用权后核对、导入。题目和讲师参考是独立改编内容。

## 数据结构

工作簿包含 Copyright、DoubleClick、Kayak 三张表。DoubleClick 有 4,510 条可计算记录、7 个 Publisher、24 个活动名称；按渠道和活动组合时为 45 组。保留源工作表和原行号。

主要字段：Publisher Name、Campaign、Keyword、Keyword ID、Match Type、Bid Strategy、Status、Search Engine Bid、Clicks、Click Charges、Impressions、Amount、Total Cost、Total Volume of Bookings。原表已有的比率字段不用来直接求平均。

默认成本取 Total Cost，销售收入取 Amount，预订取 Total Volume of Bookings。金额按案例语境标注 USD，正式发行版本仍应核对。主表缺少日期字段，不能从工作簿创建/修改日期反推统计期间。

Kayak 表明确标注独立一周：6/04/07–6/10/07。它的点击 2,839、预订 208，独立展示，不并入主表。不能未经证实合并两份数据的总量或直接比较规模。

## 已核对的主表汇总

| 指标 | 结果 |
| --- | ---: |
| 广告花费（显示到美分） | $755,315.92 |
| 点击 | 512,849 |
| 预订 | 3,939 |
| 销售收入 | $4,661,912.55 |
| 曝光 | 41,868,674 |
| 加权 CPC | $1.472784 |
| 预订 / 点击 | 0.768062% |
| CPA | $191.753217 |
| ROAS | 6.172136 倍 |

上述数值均从当前镜像求和/相除得到，不是教材官方标准答案。内部保留浮点精度，页面显示四舍五入。

## 异常与处理

- 2 条记录预订数高于点击数，保留并提醒回溯。预订 / 点击是事件计数比，不等于独立用户购买概率。
- 1 条零点击、4,142 条零预订，分母为零显示不可计算。零预订不自动判成无价值。
- 当前检查未发现必需数值缺失、负值、缺少曝光或重复的“渠道 + 关键词键”。不代表所有字段完整或跨表口径已验证。
- 跳过 1 行空白；不对异常记录删行或补造数值。
- US、Global、Overture 保留原名，不未经核实合并。
- 派生的“收入 − 广告费”未扣除机票履约等成本，不称为利润。
- 第四题以 Kayak 独立汇总比较为核心；没有规定虚构预算或未来效率。

复核可运行 `node scripts/inspect-data.mjs`。解析规则与网站共用模块，真实原文件亦纳入本地测试。

## 下载与本轮题目校准

运行 `npm run data:download` 可下载并验证同一完整镜像；已有文件若通过校验则不重复下载，若不同则保留并报错。网页首页提供直接原文件下载，无需先导入。部署版提供外部原文件链接，并可在浏览器读取镜像后验证大小与指纹。

四题按实际案例主题调整为 KPI、渠道策略、活动/关键词、未来 SEM/Kayak；具体对照见 [案例与题目对照](case-alignment.md)。旧版的品牌分层、CPA 对称分解和压力测试不再是必做题。
