# 广告分析课程案例筛选

核验日期：2026-09-14。本文记录选型研究，不是已完成的课程或原始数据审计。

## 筛选原则

1. 优先采用学校官方课程大纲、案例作者机构、正式发行商与官方实验课的证据。
2. 分别核验“真实课程使用”“正式案例存在”“配套数据存在”“已拿到并检查文件”，不混为一谈。
3. 以产运可完成的经营判断为主体，不以训练算法作为上机要求。
4. 原始案例若做过匿名化或保密处理，应如实标明；不能宣称是未经处理的企业生产日志。
5. 取得数据后保留原件、来源、版本和清洗记录；缺失字段不补造，跨案例数据不伪造关联。

## 1. Air France Internet Marketing：优先主案例

**出版机构：** Northwestern University, Kellogg School of Management。

**正式材料：** 案例 KEL319；Excel 配套材料 KEL321-XLS-ENG。发行商的教材案例目录同时列出了正文与电子表格，二者应分别确认获取。

**课程使用证据：** NYU Stern 的 Digital Marketing Analytics（INFO-GB.3310.010，Anindya Ghose）官方大纲将 Air France 列为课堂工作坊；University of Houston 的 Digital Marketing Analytics（2019）也将其列为搜索广告分析案例。

**已确认内容：** 案例讨论 Air France 的搜索广告经营，围绕搜索渠道、关键词与出价选择，使用 KPI 和数据透视表比较广告成本与机票销售表现，并提出渠道和广告活动调整建议。

**适配判断：** 在本轮已核验候选中，最适合用同一业务背景串起目标、效果诊断、细分优化和预算决策。该判断基于官方案例说明；正式文件尚未取得，不能保证所有所需字段均存在。

**边界：** 2009 年发行，适合学习经营分析方法，不能直接当作今天广告平台的操作教程。目前没有核验到逐次竞价、小时预算消耗、多触点用户路径、退款或随机对照实验等数据；这些内容不能预先承诺纳入同一案例。

来源：

- [Kellogg 官方案例页](https://www.kellogg.northwestern.edu/academics-research/research/detail/2009/airfranceinternetmarketingoptimizinggoogleyahoomsnand/)
- [NYU Stern 官方课程大纲，第 4 页](https://web-docs.stern.nyu.edu/ioms/SYLLABI/Ghose_INFOGB3310010_Summer17.pdf)
- [Houston 官方课程大纲，第 5 页](https://www.bauer.uh.edu/departments/marketing/documents/syllabi/2019/MARK-7397-Digital-Marketing-Analytics_Fall-2019_Tirunillai.pdf)
- [Harvard Business Publishing 教材案例目录：含 KEL319 与 KEL321](https://s3.amazonaws.com/he-product-images/docs/Marketingmanagement0212.pdf)
- [案例购买页](https://store.hbr.org/product/air-france-internet-marketing-optimizing-google-yahoo-msn-and-kayak-sponsored-search/KEL319)
- [配套数据产品入口](https://hbsp.harvard.edu/product/KEL321-XLS-ENG)（本次页面仅返回应用壳，未核验当前价格或附件）

## 2. Rocket Fuel：增量效果与 ROI 补充案例

**出版机构：** UC Berkeley Haas；作者 Zsolt Katona、Brian Bell；2017 年；B5894。

官方页面明确说明配有 `rocketfuel_data.csv`。案例让学生分析广告实验的随机分组、购买转化及投资回报，区分广告相关性与因果效果。Houston 的同一门 Digital Marketing Analytics 课程同时使用 Air France 与 Rocket Fuel，说明“搜索广告经营 + 展示广告实验”已有课程组合依据。

**适配判断：** 可补充独立的实验效果题。它不能直接补成 Air France 的实验表，也不能替代其跨渠道与关键词经营数据。当前只核验到正式教学数据的存在，未确认这些记录是否完全未经修改，不应宣称是原样生产日志。

来源：

- [Berkeley Haas 官方案例页](https://cases.haas.berkeley.edu/2017/07/rocketfuel/)
- [Houston 官方课程大纲，第 5 页](https://www.bauer.uh.edu/departments/marketing/documents/syllabi/2019/MARK-7397-Digital-Marketing-Analytics_Fall-2019_Tirunillai.pdf)
- [正式购买入口](https://store.hbr.org/product/rocket-fuel-measuring-the-effectiveness-of-online-advertising/B5894)

## 3. Star Digital：真实企业研究的实验案例备选

**出版机构：** Stanford Graduate School of Business；作者 Sridhar Narayanan、Taylan Yildiz；2013 年；M347。

Stanford 官方明确说明：案例基于真实企业的在线广告研究，企业名及部分数据为保密做过处理；配有包含实验样本的 Excel 文件。内容聚焦展示广告实验设计与效果评估。

**适配判断：** 作为实验测量补充很合适，对数据来历的官方说明也较清楚。其核心仍是效果测量，不是贯穿搜索广告预算、关键词和出价管理的单一经营案例。本次未核验具体公开课程大纲中的使用记录，因此不把“商学院正式案例”写成“已证实某门课程采用”。

来源：

- [Stanford GSB 官方案例页](https://www.gsb.stanford.edu/index.php/faculty-research/case-studies/star-digital)
- [正式购买入口](https://store.hbr.org/product/star-digital-assessing-the-effectivness-of-display-advertising/M347)

## 4. Google 官方电商分析实验课：可访问备选，但经营覆盖不足

Google Skills 的 GSP407《Explore an Ecommerce Dataset with SQL in BigQuery》使用 Google Merchandise Store 的 Google Analytics 数据副本，公开了 `data-to-insights.ecommerce` 下的表及去重、渠道与商品分析练习。

**适配判断：** 来源明确、SQL 练习可查，但这节实验课主要训练电商行为数据分析。公开展示的字段中没有广告成本和出价，不能仅凭它计算完整广告经营回报。实验环境可能需要账号或付费；本次未实际启动实验或导出全量数据。

来源：[Google 官方实验课](https://www.skills.google/focuses/3618?parent=catalog)。

## 未列为优先候选的课程

- **Illinois / Coursera Digital Marketing Capstone：** 专项总页仍提及 Grainger 合作，但单课当前简介明确写到虚构电子产品企业的数字营销项目。页面内容存在版本混杂，不能据此承诺提供真实完整广告投放数据。[单课页面](https://www.coursera.org/learn/digital-marketing-capstone)、[专项页面](https://www.coursera.org/specializations/digital-marketing)。
- **Emory / Coursera Marketing Analytics Capstone：** 当前项目包括贷款状态分类与逻辑回归，不符合本项目面向产运的广告经营主线。[课程页](https://www.coursera.org/learn/marketing-analytics-project)。
- 网络上的学生作业、GitHub 镜像和解答站只作为发现线索，未作为官方数据、标准答案或授权依据导入本项目。

## 四道大题的承载方式：待文件核验后定稿

以下是依据 Air France 官方学习目标整理的改编方向，不是声称已经取得的官方原题。题目、指标和图表必须以实际文件支持范围为准。

| 大题方向 | 经营判断 | 可视化候选 |
| --- | --- | --- |
| 1. 建立经营目标与评价口径 | 应按什么指标评价销售规模与投放效率？汇总指标的分母是否一致？ | 指标关系图、成本与销售概览 |
| 2. 比较渠道与分配资源 | 渠道间成本、销售效果与规模有何差异？哪些需要调整？ | 渠道成本—转化表现四象限、规模对比 |
| 3. 深入广告活动与关键词 | 渠道内部哪些活动或关键词值得保留、调整或减少投入？ | 广告活动对比、关键词贡献分布 |
| 4. 形成下一轮经营方案 | 建议改变什么、证据是什么、还需验证哪些假设？ | 预算配置对比、显式假设下的情景分析 |

情景分析中的假设必须由原案例给定或明确由学员输入，不预造预算响应曲线，也不把历史平均回报视为新增预算的因果回报。

若第四题必须要求“广告真实增量”，则应独立使用 Rocket Fuel 或 Star Digital，并说明这是第二家企业的第二份案例，不能同时宣称四题使用同一贯通数据集。

## 数据获取与落地状态

| 项目 | 本轮状态 |
| --- | --- |
| 知名机构和课程来源 | 已核验上述官方页面与大纲 |
| 正式配套数据是否存在 | Air France、Rocket Fuel、Star Digital 均有官方材料说明 |
| 官方数据文件、字段、数据量、完整性 | 尚未取得及检查，不做承诺 |
| 获取与使用 | 案例购买、配套表格获取与课堂/网站使用范围需分别确认；不能以个人购买自动推定可公开分发 |
| 课程题目与答案 | 仅确定候选承载方向，尚未计算答案 |
| 网站与图表 | 待数据选型与获取后建设，无虚构图表 |

下一步优先核验 KEL319 正文及 KEL321-XLS-ENG 数据文件；确认完整性和使用范围后，才开始数据清洗、四题编排与网站实现。
