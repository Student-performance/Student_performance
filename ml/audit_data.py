"""
Auditoría de datos para S1-AI-01 (UCI Student Performance, un solo archivo).

Uso (desde la carpeta del repositorio):
    python ml/audit_data.py data/student-por.csv

Imprime por pantalla los datos que hay que copiar en docs/data-audit.md.
No modifica el CSV.
"""
import hashlib
import sys

import pandas as pd

# Columnas candidatas acordadas en la tarjeta (features) y la columna del target.
FEATURES = ["G1", "failures", "studytime"]
TARGET_SOURCE = "G3"  # solo se usa para crear el target en el entrenamiento offline

# Rangos válidos según la documentación de UCI.
RANGOS = {
    "G1": (0, 20),
    "G2": (0, 20),
    "G3": (0, 20),
    "failures": (0, 4),   # 0-3 suspensos previos; 4 significa "3 o más"
    "studytime": (1, 4),  # 1: <2h, 2: 2-5h, 3: 5-10h, 4: >10h semanales
}


def sha256_del_archivo(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for bloque in iter(lambda: f.read(8192), b""):
            h.update(bloque)
    return h.hexdigest()


def main(ruta):
    # Los CSV de UCI usan ";" como separador, no ",".
    df = pd.read_csv(ruta, sep=";")

    print("## 1. Archivo")
    print(f"- Archivo: {ruta}")
    print(f"- SHA-256: {sha256_del_archivo(ruta)}")
    print(f"- Filas: {len(df)}")
    print(f"- Columnas: {df.shape[1]}")

    print("\n## 2. Valores que faltan (solo columnas con alguno)")
    faltan = df.isna().sum()
    faltan = faltan[faltan > 0]
    print("- Ninguno" if faltan.empty else faltan.to_string())

    print("\n## 3. Valores fuera de rango")
    for col, (lo, hi) in RANGOS.items():
        if col not in df.columns:
            print(f"- {col}: NO EXISTE en el archivo")
            continue
        malos = df[(df[col] < lo) | (df[col] > hi)]
        print(f"- {col} (esperado {lo}-{hi}): {len(malos)} fuera de rango")

    print("\n## 4. Filas duplicadas")
    print(f"- Duplicados exactos (todas las columnas): {df.duplicated().sum()}")

    print("\n## 4b. Notas exactamente 0 (posible abandono / no presentado)")
    for col in ["G1", "G2", "G3"]:
        print(f"- {col} == 0: {(df[col] == 0).sum()} filas")

    print("\n## 5. Target: G3 < 10 (suspenso)")
    target = (df[TARGET_SOURCE] < 10).astype(int)
    conteo = target.value_counts().sort_index()
    for valor, n in conteo.items():
        etiqueta = "suspende (1)" if valor == 1 else "aprueba (0)"
        print(f"- {etiqueta}: {n} ({n / len(df):.1%})")

    print("\n## 6. Ejercicio inicial: 5 filas, solo features aprobadas")
    print(df[FEATURES].head(5).to_string())


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python ml/audit_data.py ruta/al/archivo.csv", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])