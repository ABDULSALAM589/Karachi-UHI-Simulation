# Karachi Urban Heat Island (UHI) Predictive Simulation 🌍🌡️

An interactive, data-driven full-stack application designed to simulate and predict the Urban Heat Island (UHI) effect across Karachi. This tool allows policymakers and urban planners to dynamically model the impact of greening initiatives (vegetation) and structural modifications (cool roofs) on the city's surface temperatures.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-14354C?style=for-the-badge&logo=python&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=Leaflet&logoColor=white)

## 🌟 Key Features
- **Predictive ML Modeling**: Uses a XGBoost Model ($R^2 \approx 0.869$) trained on multi-year spatial datasets (NDVI, NDBI, Albedo, NDWI).
- **Interactive Map**: A sleek, dark-themed geographic heatmap displaying Karachi's surface temperatures point-by-point using `react-leaflet`.
- **Dynamic Simulation**: Sliders allowing real-time adjustments (-100% to +100%) to Vegetation (NDVI), Urbanization (NDBI), and Cool Roof coverage (Albedo).
- **Policy Impact Analytics**: Translates raw temperature changes into human-readable policy insights (e.g., peak cooling energy demand reduction).

---

## 🛠️ Tech Stack
- **Backend**: Python, FastAPI, Pandas, Scikit-Learn (MLP, Random Forest, XGBoost).
- **Frontend**: React (Vite), TailwindCSS, React-Leaflet, Axios.
- **Data**: Spatial datasets derived from Google Earth Engine spanning 2018–2025.

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+ & npm

### 1. Clone the repository
```bash
git clone https://github.com/ABDULSALAM589/Karachi-UHI-Simulation.git
cd Karachi-UHI-Simulation
```

### 2. Backend Setup
1. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Generate the baseline data and train the model (if `best_model.joblib` isn't present):
   ```bash
   python model_training.py
   ```
4. Start the FastAPI server:
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```
   *The backend will run on `http://127.0.0.1:8000`.*

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be accessible at `http://localhost:5173/`.*

---

## 📊 Usage
1. Open your browser and navigate to the React frontend.
2. The initial view displays the **baseline** Land Surface Temperatures (LST) across Karachi for the year 2025.
3. Use the sidebar to tweak the environmental factors:
   - **Vegetation**: Simulate planting more trees (or deforestation).
   - **Cool Roofs**: Simulate painting roofs white to increase solar reflectance.
   - **Urbanization**: Simulate higher density concrete and buildings.
4. Click **Run Simulation**. The frontend will ping the FastAPI backend, process the features through the ML model, and re-render the map with the new temperature profile.

---

## 📁 Repository Structure
```text
Karachi-UHI-Simulation/
├── Karachi_UHI_Data_2018_2025_Final.csv  # Original Dataset (if not ignored)
├── model_training.py                     # Script for EDA, Preprocessing, and Model Selection
├── backend/
│   ├── main.py                           # FastAPI Inference Server
│   └── requirements.txt                  # Python dependencies
├── frontend/
│   ├── src/                              # React components and styling
│   ├── package.json                      # NPM dependencies
│   └── vite.config.js                    # Vite/Tailwind configuration
└── Karachi_UHI_Project_Report.md         # Comprehensive Project Documentation
```

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
