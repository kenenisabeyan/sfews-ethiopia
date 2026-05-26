"""
🌊 SFEWS — Smart Flood Early Warning System
Machine Learning Model Training Pipeline
This script simulates historical hydrology data, trains a Random Forest Classifier
to predict flood probability based on water level and rainfall, and serializes the model.
"""

import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
import joblib

def generate_historical_hydrology_data(num_samples=10000):
    """
    Simulates historical logs across Ethiopian river basins.
    Features:
      - water_level_cm: 50.0 to 600.0 cm
      - rainfall_rate_mm: 0.0 to 150.0 mm/h
      - flood_occurred (Label): 0 (Safe) or 1 (Flooded)
    """
    np.random.seed(42)
    
    # Generate random environmental conditions
    water_levels = np.random.uniform(50.0, 600.0, num_samples)
    rainfall_rates = np.random.uniform(0.0, 150.0, num_samples)
    
    # Define a non-linear physics-based boundary with noise for flood risk
    # Combining water levels and heavy rain thresholds
    risk_score = (water_levels * 0.0015) + (rainfall_rates * 0.005) + np.random.normal(0, 0.15, num_samples)
    
    # Binary label: If risk score > 0.8, a flood is highly likely
    flood_labels = (risk_score > 0.8).astype(int)
    
    data = pd.DataFrame({
        "water_level_cm": water_levels,
        "rainfall_rate_mm": rainfall_rates,
        "flood_occurred": flood_labels
    })
    
    return data

def train_pipeline():
    print("🌊 Starting SFEWS ML Pipeline Training...")
    
    # 1. Generate / Load datasets
    df = generate_historical_hydrology_data(num_samples=15000)
    print(f"Dataset generated. Shape: {df.shape}")
    print(f"Class distribution:\n{df['flood_occurred'].value_counts(normalize=True)}")
    
    # 2. Features and Target
    X = df[["water_level_cm", "rainfall_rate_mm"]]
    y = df["flood_occurred"]
    
    # 3. Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # 4. Initialize & Train Random Forest Classifier
    # We use a constrained tree depth to prevent overfitting and optimize inference speed on the backend
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        random_state=42,
        class_weight="balanced"
    )
    
    print("\nTraining Random Forest model...")
    model.fit(X_train, y_train)
    
    # 5. Evaluate Model
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    print("\n--- Model Performance Report ---")
    print(classification_report(y_test, y_pred))
    print(f"ROC AUC Score: {roc_auc_score(y_test, y_prob):.4f}")
    
    # 6. Serialize and save the model artifact
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "sfews_flood_rf_model.pkl")
    joblib.dump(model, model_path)
    print(f"\n✅ Model serialized successfully and saved to: {model_path}")
    
    # Print feature importances
    importances = model.feature_importances_
    print("\nFeature Importances:")
    print(f" - Water Level (cm): {importances[0]:.4f}")
    print(f" - Rainfall Rate (mm/h): {importances[1]:.4f}")

if __name__ == "__main__":
    train_pipeline()
