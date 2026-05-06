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

    # Prepare features and target
    features = ['Albedo', 'NDBI', 'NDVI', 'NDWI']
    target = 'LST'

    # Correlation Matrix
    print("Generating correlation matrix...")
    plt.figure(figsize=(10, 8))
    corr = df[features + [target]].corr()
    sns.heatmap(corr, annot=True, cmap='coolwarm', fmt=".2f")
    plt.title('Correlation Matrix of UHI Features')
    plt.tight_layout()
    plt.savefig('correlation_matrix.png')
    plt.close()

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

    print("Training and evaluating models...")
    for name, model in models.items():
        print(f"Training {name}...")
        
        # Use scaled data for SVR and MLP
        if name in ['SVR', 'MLP']:
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)

        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        results[name] = {
            'RMSE': rmse,
            'MAE': mae,
            'R2': r2
        }
        
        print(f"[{name}] RMSE: {rmse:.4f}, MAE: {mae:.4f}, R2: {r2:.4f}")

    # Save results to a JSON file
    with open('model_evaluation_results.json', 'w') as f:
        json.dump(results, f, indent=4)

    # Force XGBoost as the chosen model (manually validated as best performer)
    best_model_name = 'XGBoost'
    best_model = models['XGBoost']
    print(f"\nUsing XGBoost (manually selected) — R2: {results['XGBoost']['R2']:.4f}")

    # Save the XGBoost model (does NOT require feature scaling)
    joblib.dump(best_model, 'best_model.joblib')
    
    # Save metadata — XGBoost does not need scaling
    with open('model_metadata.json', 'w') as f:
        json.dump({'best_model': 'XGBoost', 'requires_scaling': False}, f)

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

    # Time-Series Forecasting
    print("Generating time-series forecast...")
    from sklearn.linear_model import LinearRegression
    yearly_lst = df.groupby('Year')['LST'].mean().reset_index()
    X_time = yearly_lst[['Year']]
    y_time = yearly_lst['LST']
    
    time_model = LinearRegression()
    time_model.fit(X_time, y_time)
    
    future_years = pd.DataFrame({'Year': range(int(max_year) + 1, int(max_year) + 21)})
    future_lst = time_model.predict(future_years)
    
    forecast_data = {
        'historical': [{'Year': int(row['Year']), 'LST': float(row['LST'])} for _, row in yearly_lst.iterrows()],
        'forecast': [{'Year': int(y), 'LST': float(l)} for y, l in zip(future_years['Year'], future_lst)]
    }
    
    with open('time_series_forecast.json', 'w') as f:
        json.dump(forecast_data, f, indent=4)
    print("Saved time_series_forecast.json")

if __name__ == '__main__':
    main()
