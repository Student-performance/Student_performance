"""S3-AI-02: check the frozen CLI with the shared fixtures (no test data)."""
import json
import math
import subprocess
import sys
from pathlib import Path

COMMAND = [sys.executable, 'ml/predict.py', '--model', 'ml/models/student_risk_v1.pkl', '--threshold', '0.5']


def run(text, command=COMMAND):
    return subprocess.run(command, input=text, text=True, capture_output=True, timeout=30)


def fixture(name):
    return Path('ml/examples/' + name).read_text(encoding='utf-8')


metadata = json.loads(Path('ml/models/model_metadata.json').read_text())
expected = json.loads(fixture('expected_output_v1.json'))

# 1) envelope request: metadata + results equal to the frozen expected fixture
wrapped = run(fixture('valid_two_rows_envelope.json'))
assert wrapped.returncode == 0, wrapped.stderr
output = json.loads(wrapped.stdout)
assert output == expected, 'output differs from expected_output_v1.json'
assert output['model_version'] == metadata['model_version'] and output['schema_version'] == 'schema-v1'
assert output['threshold'] == 0.5 and output['count'] == 2
assert [r['row_id'] for r in output['results']] == ['ROW-001', 'ROW-002']
for r in output['results']:
    assert type(r['risk_flag']) is bool and math.isfinite(r['risk_score']) and 0 <= r['risk_score'] <= 1
    assert r['risk_flag'] == (r['risk_score'] >= 0.5)

# 2) bare array request: same scores, array protocol
bare = run(fixture('valid_two_rows.json'))
assert bare.returncode == 0, bare.stderr
assert json.loads(bare.stdout) == output['results']

# 3) invalid requests: exit 1, nothing on stdout, message on stderr
for name in ['invalid_g1_out_of_range.json', 'invalid_missing_studytime.json', 'invalid_g2_included.json']:
    failed = run(fixture(name))
    assert failed.returncode == 1 and failed.stdout == '' and failed.stderr.strip(), name
failed = run('not json')
assert failed.returncode == 1 and failed.stdout == ''

# 4) wrong threshold is rejected
failed = run(fixture('valid_two_rows_envelope.json'), COMMAND[:-1] + ['0.4'])
assert failed.returncode == 1 and failed.stdout == ''

print('Frozen CLI checks passed:', metadata['model_version'])
print('Scores for the 2 synthetic rows:', [round(r['risk_score'], 4) for r in output['results']])
print('No held-out (test) evaluation performed.')
