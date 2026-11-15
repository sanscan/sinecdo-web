"""Read-only deployment check. Does not submit forms or execute Analytics."""
import hashlib, json, os, time, urllib.request
from pathlib import Path

base = 'https://sinecdo.com'
release = os.environ.get('GITHUB_SHA', 'manual')[:12]
out = Path('qa-output'); out.mkdir(exist_ok=True)
report = {'release': release, 'checked_at_utc': None, 'files': [], 'pages': [], 'scope': 'Read-only HTTPS requests; not proof of Analytics report ingestion'}
def get(resource):
    sep = '&' if '?' in resource else '?'
    req = urllib.request.Request(base + resource + sep + 'sc_verify=' + release, headers={'Cache-Control':'no-cache','User-Agent':'Sinecdo-Deployment-QA/1.0'})
    with urllib.request.urlopen(req, timeout=15) as response:
        if not response.url.startswith(base + '/'):
            raise RuntimeError('Unexpected redirect')
        return response.read().decode('utf-8').replace('\r\n','\n'), response.status

def digest(text): return hashlib.sha256(text.encode()).hexdigest()

asset = 'assets/analytics/ga4.js'
expected = Path(asset).read_text()
last = None
for attempt in range(1, 13):
    try:
        body, status = get('/' + asset)
        if digest(body) == digest(expected):
            print('Exact analytics asset is live, attempt', attempt)
            break
        last = 'asset differs from checked-out release'
    except Exception as exc:
        last = type(exc).__name__ + ': ' + str(exc)
    print('Deployment not yet verified, attempt', attempt, last)
    if attempt == 12: raise SystemExit('Live GA4 asset not verified: ' + str(last))
    time.sleep(10)

for asset in ['assets/analytics/ga4.js','assets/analytics/consent.css','assets/quiz/capture.js']:
    actual, status = get('/'+asset)
    expected = Path(asset).read_text()
    ok = digest(actual)==digest(expected)
    report['files'].append({'path':asset,'status':status,'sha256':digest(actual),'matches_release':ok})
    if not ok: raise SystemExit('Deployed asset mismatch: '+asset)

for page in ['/','/en/','/it/','/quest/','/privacy/es/','/privacy/en/','/privacy/it/']:
    actual,status = get(page)
    ok = actual.count('/assets/analytics/ga4.js')==1 and actual.count('/assets/analytics/consent.css')==1
    report['pages'].append({'path':page,'status':status,'single_analytics_include':ok})
    if not ok: raise SystemExit('Analytics include missing/duplicated: '+page)
report['checked_at_utc'] = time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
report['deployment_verified'] = True
(out/'live-deployment.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
