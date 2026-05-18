# 🌊 Smart Flood Early Warning System (SFEWS) - Ethiopia

SFEWS is a comprehensive, full-stack application designed to monitor environmental sensors, analyze data, and provide early warnings for potential flooding events. It integrates IoT hardware, a robust Python FastAPI backend, a machine-learning engine for predictions, and a sleek React (Vite) dashboard.

## 🚀 Technology Stack

- **Frontend:** React, Vite, Tailwind CSS, Axios, Recharts, Lucide Icons
- **Backend:** Python, FastAPI, Uvicorn, Pydantic
- **Database:** PostgreSQL (via SQLAlchemy / Psycopg2)
- **Machine Learning:** Jupyter Notebooks, LSTM models (Keras/TensorFlow)
- **IoT Firmware:** C++ (ESP32 / PlatformIO), MQTT Protocol

## 📁 Project Structure

```text
sfews-ethiopia/
├── backend/          # FastAPI Application & API Endpoints
├── frontend/         # React + Vite UI Dashboard
├── firmware/         # C++ Code for ESP32 Sensor Nodes
├── ml-research/      # Jupyter Notebooks & ML Models for Flood Prediction
```

## 🛠️ Getting Started

### 1. Environment Setup

Clone this repository, then create your own `.env` file based on the template:
```bash
cp .env.example .env
```
*Be sure to fill in your database credentials and API keys inside `.env`.*

### 2. Running the Backend

The backend uses FastAPI and requires a Python virtual environment.

```bash
cd backend

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies if you haven't already
pip install -r requirements.txt

# Start the development server
uvicorn app.main:app --reload
```
The API will be available at `http://localhost:8000`

### 3. Running the Frontend

The frontend is a Vite + React application styled with Tailwind CSS.

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The Dashboard will be accessible at `http://localhost:5173`

## 🤝 Contributing
1. Create a feature branch
2. Commit your changes
3. Open a Pull Request

## 📄 License
This project is part of a university project.
