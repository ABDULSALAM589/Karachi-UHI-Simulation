import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.svm import SVR
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import json

def main():
    print("Loading data...")
    # Load dataset
    df = pd.read_csv('Karachi_UHI_Data_2018_2025_Final.csv')

    # Drop unnecessary spatial pixel columns if they exist
    cols_to_drop = ['system:index', '.geo']
    for col in cols_to_drop:
        if col in df.columns:
            df.drop(columns=[col], inplace=True)

    # Handle missing values
    print("Handling missing values...")
    df.dropna(inplace=True)

    # Correlation Matrix
    print("Generating correlation matrix...")
    plt.figure(figsize=(10, 8))
    corr = df.corr()
    sns.heatmap(corr, annot=True, cmap='coolwarm', fmt=".2f")
    plt.title('Correlation Matrix of UHI Features')
    plt.tight_layout()
    plt.savefig('correlation_matrix.png')
    plt.close()

    # Prepare features and target
    features = ['Albedo', 'NDBI', 'NDVI', 'NDWI']
    target = 'LST'

    X = df[features]
    y = df[target]

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Scale the features for SVR and MLP
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Initialize models
    models = {
        'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        'XGBoost': XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        'SVR': SVR(),
        'MLP': MLPRegressor(hidden_layer_sizes=(100, 50), max_iter=500, random_state=42)
    }

    results = {}
    best_model_name = ""
    best_r2 = -float('inf')
    best_model = None
    best_model_needs_scaling = False

    print("Training and evaluating models...")
    for name, model in models.items():
        print(f"Training {name}...")
        
        # Use scaled data for SVR and MLP
        if name in ['SVR', 'MLP']:
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            needs_scaling = True
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            needs_scaling = False

        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        results[name] = {
            'RMSE': rmse,
            'MAE': mae,
            'R2': r2
        }
        
        print(f"[{name}] RMSE: {rmse:.4f}, MAE: {mae:.4f}, R2: {r2:.4f}")

        if r2 > best_r2:
            best_r2 = r2
            best_model_name = name
            best_model = model
            best_model_needs_scaling = needs_scaling

    # Save results to a JSON file
    with open('model_evaluation_results.json', 'w') as f:
        json.dump(results, f, indent=4)

    print(f"\nBest Model: {best_model_name} with R2 = {best_r2:.4f}")

    # Save the best model
    joblib.dump(best_model, 'best_model.joblib')
    if best_model_needs_scaling:
        joblib.dump(scaler, 'scaler.joblib')
        print("Saved scaler.joblib as the best model requires feature scaling.")
    
    # Save a metadata file to know if scaling is needed
    with open('model_metadata.json', 'w') as f:
        json.dump({'best_model': best_model_name, 'requires_scaling': best_model_needs_scaling}, f)

    # Create baseline data for frontend
    # Filter for the most recent year
    max_year = df['Year'].max()
    print(f"Generating baseline data for year {max_year}...")
    baseline_df = df[df['Year'] == max_year].copy()
    
    # We might have too many points for a frontend to render smoothly, so let's sample it if necessary.
    # Leaflet can handle a few thousand points, but let's limit to say, 5000 points for performance.
    if len(baseline_df) > 5000:
        baseline_df = baseline_df.sample(n=5000, random_state=42)
        
    baseline_df.to_csv('baseline_data.csv', index=False)
    print("Saved baseline_data.csv for frontend.")

if __name__ == '__main__':
    main()
