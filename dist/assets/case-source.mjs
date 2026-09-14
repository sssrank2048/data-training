// Facts inspected from the unchanged public workbook; never substitute these for imported results.
export const caseFile = {
  filename: 'air-france-mirror.xls',
  url: 'https://raw.githubusercontent.com/fairypp/Air_France_Internet_Marketing/master/Air%20France%20Internet%20Marketing.xls',
  repository: 'https://github.com/fairypp/Air_France_Internet_Marketing/blob/master/Air%20France%20Internet%20Marketing.xls',
  sha256: 'c1e71191caacb17a4ee14815803a65d9f39bb27cfc07ed5f7f0c243e7ca78a0c',
  bytes: 1975296,
  rows: 4510,
  publishers: 7,
  campaigns: 24,
  fields: 23,
  sheets: ['Copyright', 'DoubleClick', 'Kayak'],
  verifiedOn: '2026-09-14',
};

export const fieldGroups = [
  ['投放主体', 'Publisher ID · Publisher Name', '渠道标识和名称；保留 US、Global、Overture 等原始标签。'],
  ['关键词与活动', 'Keyword ID · Keyword · Match Type · Campaign · Keyword Group · Category · Keyword Type', '从渠道下钻到活动和关键词，比较匹配方式。不是搜索词查询日志。'],
  ['投放设置', 'Bid Strategy · Status · Search Engine Bid', '出价策略、状态和出价；没有逐次竞价记录或调整时间。'],
  ['曝光与点击', 'Impressions · Clicks · Engine Click Thru % · Avg. Pos.', '曝光、点击、原表点击率和平均位置；汇总比率需重新计算。'],
  ['花费', 'Click Charges · Avg. Cost per Click · Total Cost', '点击收费、平均点击成本、总成本；本课按 Total Cost 汇总。'],
  ['预订与收入', 'Total Volume of Bookings · Trans. Conv. % · Total Cost/ Trans. · Amount', '预订量、原表转化率和每次转化成本、销售收入；不包含机票履约成本。'],
];
