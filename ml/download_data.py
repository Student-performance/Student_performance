"""Acquire the canonical UCI math source; compute provenance locally."""
import hashlib
import io
import zipfile
import urllib.request
import csv
from pathlib import Path

NUMERIC = {'age': (15, 22), 'Medu': (0, 4), 'Fedu': (0, 4), 'traveltime': (1, 4),
           'studytime': (1, 4), 'failures': (0, 4), 'famrel': (1, 5), 'freetime': (1, 5),
           'goout': (1, 5), 'Dalc': (1, 5), 'Walc': (1, 5), 'health': (1, 5),
           'absences': (0, 93), 'G1': (0, 20), 'G2': (0, 20), 'G3': (0, 20)}
CATEGORICAL = {'school': ['GP', 'MS'], 'sex': ['F', 'M'], 'address': ['U', 'R'],
               'famsize': ['LE3', 'GT3'], 'Pstatus': ['T', 'A'],
               'Mjob': ['teacher', 'health', 'services', 'at_home', 'other'],
               'Fjob': ['teacher', 'health', 'services', 'at_home', 'other'],
               'reason': ['home', 'reputation', 'course', 'other'], 'guardian': ['mother', 'father', 'other']}
for key in ['schoolsup', 'famsup', 'paid', 'activities', 'nursery', 'higher', 'internet', 'romantic']:
    CATEGORICAL[key] = ['yes', 'no']

def audit_source(source):
    rows = list(csv.reader(io.StringIO(source.decode('utf-8')), delimiter=';'))
    header, records = rows[0], rows[1:]
    if len(header) != 33 or set(header) != set(NUMERIC) | set(CATEGORICAL):
        raise ValueError('Expected the 33 canonical UCI source columns')
    if len(records) != 395 or any(len(row) != 33 for row in records):
        raise ValueError('Expected 395 complete Mathematics source records')
    missing = invalid = duplicates = 0
    seen = set()
    for row in records:
        observation = tuple(row)
        duplicates += int(observation in seen)
        seen.add(observation)
        for name, value in zip(header, row):
            if not value.strip() or value.strip() == '?':
                missing += 1
                continue
            if name in NUMERIC:
                low, high = NUMERIC[name]
                try:
                    number = int(value)
                    if not low <= number <= high:
                        invalid += 1
                except ValueError:
                    invalid += 1
            elif value not in CATEGORICAL[name]:
                invalid += 1
    return dict(row_count=len(records), column_count=len(header), missing_cells=missing,
                invalid_cells=invalid, duplicate_observations=duplicates)

def download():
    url = 'https://archive.ics.uci.edu/static/public/320/student+performance.zip'
    with urllib.request.urlopen(url, timeout=60) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    # The UCI distribution contains a nested student.zip.
    if 'student.zip' in archive.namelist():
        archive = zipfile.ZipFile(io.BytesIO(archive.read('student.zip')))
    names = [name for name in archive.namelist() if name.endswith('student-mat.csv')]
    if len(names) != 1:
        raise ValueError('Unexpected UCI archive structure')
    source = archive.read(names[0])
    Path('data').mkdir(exist_ok=True)
    Path('data/student-mat.csv').write_bytes(source)
    audit = audit_source(source)
    digest = hashlib.sha256(source).hexdigest()
    Path('docs').mkdir(exist_ok=True)
    Path('docs/data-audit.md').write_text('# UCI source audit\n\nSource: ' + url + '\n\nSHA-256: ' + digest +
        '\n\nCitation: Cortez, P. (2008). Student Performance [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T\n'
        '\nLicense: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ (see https://archive.ics.uci.edu/dataset/320/student+performance).\n'
        '\n## Measured source checks\n' + '\n'.join('- ' + key + ': ' + str(value) for key, value in audit.items()) +
        '\n\nG2/G3 are excluded from model features. G3 is only the offline target source. Retrospective educational experiment only. Field availability at the end of Period 1 is not established.\n')
    if audit['missing_cells'] or audit['invalid_cells'] or audit['duplicate_observations']:
        raise ValueError('Source audit failed: inspect docs/data-audit.md; stop before splitting or training')
    print('Source SHA-256:', digest)

if __name__ == '__main__':
    download()
