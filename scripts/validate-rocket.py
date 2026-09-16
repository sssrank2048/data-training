"""Optional independent validation: requires statsmodels/scipy. Never generates course data."""
import csv
import json
import math
from pathlib import Path
from statsmodels.stats.proportion import confint_proportions_2indep, samplesize_proportions_2indep_onetail

rows = list(csv.DictReader(open('data/private/rocketfuel_data.csv', encoding='utf-8-sig')))
arms = {k: {'users': sum(r['test'] == k for r in rows),
            'conversions': sum(int(r['converted']) for r in rows if r['test'] == k),
            'impressions': sum(int(r['tot_impr']) for r in rows if r['test'] == k)} for k in ['0', '1']}
c, t = arms['0'], arms['1']
ci = confint_proportions_2indep(t['conversions'], t['users'], c['conversions'], c['users'], method='newcomb', compare='diff')
inspection = json.loads(Path('data/private/rocket-inspection.json').read_text())
assert [c, t] == inspection['summary']['arms']
assert all(abs(float(x)-y) < 1e-14 for x, y in zip(ci, inspection['effect']['ci']))
plans = []
for share in [.5, .2, .04]:
    n = samplesize_proportions_2indep_onetail(diff=.005, prop2=t['conversions']/t['users'], power=.8, ratio=share/(1-share), alpha=.05, alternative='two-sided')
    plans.append({'controlShare': share, 'treatment': math.ceil(n), 'control': math.ceil(math.ceil(n)*share/(1-share))})
output = {'arms': arms, 'ci': list(ci), 'samplePlansAtPlanningMdeHalfPoint': plans}
Path('data/private/rocket-independent-validation.json').write_text(json.dumps(output, indent=2))
print(json.dumps(output, indent=2))
