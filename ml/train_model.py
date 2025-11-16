import pandas as pd
import joblib
from lightgbm import LGBMRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

df = pd.read_csv("sample_dataset.csv")
X = df.drop(columns=["energyLabel"])
y = df["energyLabel"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LGBMRegressor(n_estimators=200, learning_rate=0.05, max_depth=6)
model.fit(X_train, y_train)
pred = model.predict(X_test)
print("MAE:", mean_absolute_error(y_test, pred))
print("R2:", r2_score(y_test, pred))
joblib.dump(model, "energy_model.pkl")
print("Saved energy_model.pkl")