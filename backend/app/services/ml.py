def predict_flood_probability(water_level_cm: float, rainfall_rate_mm: float) -> float:
    """
    Weighted ensemble mock for ML Pipeline.
    In a real-world scenario, this would load a pre-trained model 
    (e.g., Random Forest or LSTM) and run inference.
    """
    normalized_water = min(water_level_cm / 500.0, 1.0)
    normalized_rain = min(rainfall_rate_mm / 100.0, 1.0)
    
    probability = (normalized_water * 0.6) + (normalized_rain * 0.4)
    
    if probability > 0.6:
        probability += 0.15 
        
    return min(max(probability, 0.0), 1.0)

def evaluate_risk_tier(probability: float) -> str:
    """
    Categorize risk tier based on flood probability.
    """
    if probability >= 0.75:
        return "Critical"
    elif probability >= 0.45:
        return "Warning"
    else:
        return "Safe"
