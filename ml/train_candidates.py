import pandas as pd, joblib, json, os
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier

NUM_COLS = ['age', 'Medu', 'Fedu', 'traveltime', 'studytime', 'failures', 'famrel', 'freetime', 'goout', 'Dalc', 'Walc', 'health', 'absences', 'G1']
CAT_COLS = ['school', 'sex', 'address', 'famsize', 'Pstatus', 'Mjob', 'Fjob', 'reason', 'guardian', 'schoolsup', 'famsup', 'paid', 'activities', 'nursery', 'higher', 'internet', 'romantic']

def train():
    os.makedirs('ml/artifacts', exist_ok=True)
    train_df = pd.read_csv('data/train.csv')
    X_train = train_df[NUM_COLS + CAT_COLS]
    y_train = (train_df['G3'] < 10).astype(int)
    preprocessor = ColumnTransformer(transformers=[
        ('num', StandardScaler(), NUM_COLS),
        ('cat', OneHotEncoder(handle_unknown='ignore'), CAT_COLS)
    ])
    dummy = DummyClassifier(strategy='most_frequent')
    dummy.fit(X_train, y_train)
    joblib.dump(dummy, 'ml/artifacts/candidate_dummy.joblib')
    pipe_lr = Pipeline([
        ('pre', preprocessor),
        ('clf', LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42))
    ])
    pipe_lr.fit(X_train, y_train)
    joblib.dump(pipe_lr, 'ml/artifacts/candidate_lr.joblib')
    print('Baseline and Logistic Regression trained and saved to ml/artifacts/')

if __name__ == '__main__': train()