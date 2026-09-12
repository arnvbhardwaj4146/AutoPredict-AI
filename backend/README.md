# AutoPredict AI - Backend & Machine Learning Engine

The backend for AutoPredict AI is built with **FastAPI**, **SQLAlchemy** (SQLite), **Pydantic v2**, and **scikit-learn** Random Forest models.

## Machine Learning Architecture

- `app/ml/generate_data.py`: Generates 5,000 synthetic records modeling wear, thermal stress, and driving habits saved to `backend/data/vehicle_data.csv`.
- `app/ml/train_models.py`: Preprocesses data with `ColumnTransformer` (OneHotEncoder + StandardScaler), splits 80/20 (`random_state=42`), trains 6 Random Forest models, records metrics in `backend/data/model_metrics.json`, and serializes models to `backend/app/ml/saved_models/`.
- `app/ml/predict.py`: Singleton model loader and inference engine that derives component health consistently (`health = 100 - failure_probability`) and dynamically formulates prioritized maintenance recommendations.
- `tests/test_ml_pipeline.py`: Automated test suite asserting model existence, metrics, and inference contrast on healthy vs. risky vehicles.

## Model Evaluation Metrics

| Target | Model Type | Metric | Score |
|---|---|---|---|
| `overall_health_score` | Regressor | R² / MAE | **0.9507** / 3.34 points |
| `engine_failure` | Classifier | Accuracy / F1 | **93.5%** / 0.850 |
| `battery_failure` | Classifier | Accuracy / F1 | **86.9%** / 0.767 |
| `brake_failure` | Classifier | Accuracy / F1 | **90.0%** / 0.718 |
| `tyre_failure` | Classifier | Accuracy / F1 | **77.0%** / 0.551 |
| `maintenance_distance` | Regressor | R² / MAE | **0.9799** / 251.0 km |

## Running Locally

1. Activate virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

2. Train models:
   ```powershell
   python app\ml\train_models.py
   ```

3. Run pipeline tests:
   ```powershell
   python tests\test_ml_pipeline.py
   ```

4. Start FastAPI server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```

5. Interactive API Documentation:
   - Swagger UI: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/api/health`
