import hashlib
import json
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split

def split():
    source = Path('data/student-mat.csv')
    df = pd.read_csv(source, sep=';')
    assert df.shape == (395, 33) and not df.isna().any().any()
    # Exact duplicate observations would violate this preregistered experiment.
    # Stop for protocol review rather than silently changing fixed counts or separating identical records.
    assert not df.duplicated().any(), 'Exact duplicates found: stop and revise protocol before training'
    df['row_id'] = [f'row_{i+1:03d}' for i in range(len(df))]
    train, remainder = train_test_split(df, test_size=119, random_state=42, stratify=(df.G3 < 10).astype(int))
    val, test = train_test_split(remainder, test_size=60, random_state=42, stratify=(remainder.G3 < 10).astype(int))
    frames = {'train': train, 'val': val, 'test': test}
    sets = [set(frame.row_id) for frame in frames.values()]
    assert not (sets[0] & sets[1] or sets[0] & sets[2] or sets[1] & sets[2])
    assert [len(frame) for frame in frames.values()] == [276, 59, 60]
    Path('ml/artifacts').mkdir(parents=True, exist_ok=True)
    manifest = dict(source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(), seed=42, total_rows=395,
                    duplicate_policy='Abort on exact duplicate observations; no inferred person matching')
    for name, frame in frames.items():
        target = Path(f'data/{name}.csv')
        frame.to_csv(target, index=False)
        manifest[f'{name}_rows'] = len(frame)
        manifest[f'{name}_ids'] = frame.row_id.tolist()
        manifest[f'{name}_sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
        manifest[f'{name}_at_risk_ratio'] = float((frame.G3 < 10).mean())
    Path('ml/artifacts/split_manifest.json').write_text(json.dumps(manifest, indent=2))
    return manifest

if __name__ == '__main__':
    split()
