"""Check the supplied Sprint 1 CLI fixtures; run before publishing the handoff."""
import json
import subprocess
import sys
from pathlib import Path

def invoke(name):
    return subprocess.run([sys.executable, 'ml/predict.py'],
                          input=Path('ml/examples/' + name).read_text(encoding='utf-8'),
                          text=True, capture_output=True, timeout=15)

bare = invoke('valid_two_rows.json')
assert bare.returncode == 0, bare.stderr
results = json.loads(bare.stdout)
assert isinstance(results, list) and len(results) == 2
for row in results:
    assert 0 <= row['risk_score'] <= 1
    assert row['risk_flag'] == int(row['risk_score'] >= 0.5)
    assert 'model_version' not in row
wrapped = invoke('valid_two_rows_envelope.json')
assert wrapped.returncode == 0, wrapped.stderr
output = json.loads(wrapped.stdout)
assert output['success'] is True
assert output['schema_version'] == 'schema-v1'
assert output['model_version'] == 'v0.1-toy-contract-spike'
assert output['threshold'] == 0.5 and output['count'] == 2
assert output['results'] == results
for name in ['invalid_g1_out_of_range.json', 'invalid_missing_studytime.json', 'invalid_g2_included.json']:
    failed = invoke(name)
    assert failed.returncode != 0, name
    assert failed.stdout.strip() == '', name
    assert failed.stderr.strip(), name
print('Sprint 1 CLI contract fixtures passed; toy scores are not measured predictions.')
