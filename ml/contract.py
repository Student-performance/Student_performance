import math

SCHEMA_VERSION = 'schema-v1'
NUMERIC = {'age': (15, 22), 'Medu': (0, 4), 'Fedu': (0, 4), 'traveltime': (1, 4),
           'studytime': (1, 4), 'failures': (0, 4), 'famrel': (1, 5), 'freetime': (1, 5),
           'goout': (1, 5), 'Dalc': (1, 5), 'Walc': (1, 5), 'health': (1, 5),
           'absences': (0, 93), 'G1': (0, 20)}
CATEGORICAL = {'school': ['GP', 'MS'], 'sex': ['F', 'M'], 'address': ['U', 'R'],
               'famsize': ['LE3', 'GT3'], 'Pstatus': ['T', 'A'],
               'Mjob': ['teacher', 'health', 'services', 'at_home', 'other'],
               'Fjob': ['teacher', 'health', 'services', 'at_home', 'other'],
               'reason': ['home', 'reputation', 'course', 'other'], 'guardian': ['mother', 'father', 'other']}
for key in ['schoolsup', 'famsup', 'paid', 'activities', 'nursery', 'higher', 'internet', 'romantic']:
    CATEGORICAL[key] = ['yes', 'no']
FEATURES = list(NUMERIC) + list(CATEGORICAL)
METADATA = {'row_id', 'student_row_id', 'row_identifier'}

def validate_rows(payload):
    envelope = isinstance(payload, dict)
    if envelope and (set(payload) != {'schema_version', 'rows'} or payload['schema_version'] != SCHEMA_VERSION):
        raise ValueError('Unsupported schema version or envelope')
    rows = payload['rows'] if envelope else payload
    if not isinstance(rows, list) or not 1 <= len(rows) <= 500:
        raise ValueError('Expected 1–500 rows')
    features, identifiers, seen = [], [], set()
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError('Row must be an object')
        if 'features' in row:
            if set(row) - METADATA - {'features'}:
                raise ValueError('Unsupported row fields')
            data = row['features']
        else:
            data = {key: value for key, value in row.items() if key not in METADATA}
        if not isinstance(data, dict) or set(data) != set(FEATURES):
            raise ValueError('Exactly 31 canonical features required; G2/G3 are forbidden')
        for key, (low, high) in NUMERIC.items():
            value = data[key]
            if type(value) not in (int, float) or not math.isfinite(value) or int(value) != value or not low <= value <= high:
                raise ValueError(f'Invalid numeric feature: {key}')
        for key, choices in CATEGORICAL.items():
            if data[key] not in choices:
                raise ValueError(f'Invalid categorical feature: {key}')
        row_id = row.get('row_id') or row.get('row_identifier') or row.get('student_row_id') or f'ROW-{i+1:03d}'
        student_id = row.get('student_row_id', row_id)
        label = row.get('row_identifier', row_id)
        if any(not isinstance(value, str) or not value for value in (row_id, student_id, label)) or row_id in seen:
            raise ValueError('Invalid or duplicate row identifier')
        seen.add(row_id)
        identifiers.append(dict(row_id=row_id, student_row_id=student_id, row_identifier=label))
        features.append(data)
    return envelope, features, identifiers
