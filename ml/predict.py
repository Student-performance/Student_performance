"""Sprint 1 protocol probe. Replaced by predict.py in Sprint 3; never a measured model."""
import argparse
import json
import sys
from contract import validate_rows, SCHEMA_VERSION

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model')
    parser.add_argument('--threshold', type=float, default=0.5)
    args = parser.parse_args()
    try:
        if args.threshold != 0.5:
            raise ValueError('Frozen threshold must be 0.5')
        envelope, features, identifiers = validate_rows(json.load(sys.stdin))
        results = []
        for row, ids in zip(features, identifiers):
            score = 0.85 if row['G1'] < 10 else 0.15
            results.append(dict(**ids, risk_score=score, risk_flag=int(score >= 0.5)))
        json.dump(dict(success=True, model_version='v0.1-toy-contract-spike', schema_version=SCHEMA_VERSION,
                       threshold=0.5, count=len(results), results=results) if envelope else results, sys.stdout)
        return 0
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
