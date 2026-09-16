export const sources={
 official:'https://store.hbr.org/product/rocket-fuel-measuring-the-effectiveness-of-online-advertising/B5894',
 haas:'https://cases.haas.berkeley.edu/2017/07/rocketfuel/',
 course:'https://faculty.haas.berkeley.edu/zskatona/ewmba206-f21.html',
 caseMirror:'https://pdfcoffee.com/rocket-fuel-measuring-the-effectiveness-of-online-advertising-pdf-free.html',
 dataMirror:'https://github.com/OguzhanCetinkaya/rocketfuel/blob/b2d2b779bd38dd7813623e25786d53fcb7012005/rocketfuel_data.csv',
 ci:'https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.confint_proportions_2indep.html',
 power:'https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.samplesize_proportions_2indep_onetail.html'
};
export const caseFile={filename:'rocketfuel_data.csv',bytes:12024311,rows:588101,sha256:'5e2325b50ed34283a38b011f12323609bbf6554236c17632c84cd3a6866097a2',commit:'b2d2b779bd38dd7813623e25786d53fcb7012005',url:'https://raw.githubusercontent.com/OguzhanCetinkaya/rocketfuel/b2d2b779bd38dd7813623e25786d53fcb7012005/rocketfuel_data.csv',local:'/__local/rocketfuel_data.csv'};
export const parameters={cpm:9,margin:40,controlShare:.04,period:'2015 年 11 月—2016 年 2 月',source:'案例正文第 2–3 页；公开正文镜像核对，非逐用户交易字段'};
export const fieldDictionary=[
 ['user_id','用户标识','一行一个 Cookie 识别的用户；不是订单 ID。','标识'],
 ['test','随机组别','1 = 商业广告；0 = PSA 公益广告对照。','分组'],
 ['converted','是否购买','活动期内购买为 1，否则为 0；不是订单数。','结果'],
 ['tot_impr','累计曝光次数','商业广告或 PSA 的累计次数；不是点击。','投放后'],
 ['mode_impr_day','曝光最多的星期','1 = 周一，7 = 周日；不是转化发生日。','投放后'],
 ['mode_impr_hour','曝光最多的小时','0–23；不是逐次曝光时间或转化时间。','投放后']
];
