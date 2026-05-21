import os
import httpx
from typing import Dict, Optional

async def get_weather_forecast(lat: float, lon: float) -> Dict:
    """
    Fetches the 5-day/3-hour weather forecast from OpenWeather API.
    Strips the heavy payload down to just the essential rainfall and weather data.
    """
    api_key = os.getenv("OPEN_WEATHER_API_KEY")
    if not api_key:
        print("Warning: OPEN_WEATHER_API_KEY is not set.")
        return {"error": "Weather API key is not configured."}

    url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            response.raise_for_status()
            data = response.json()
        
        # We only want the next 24 hours (8 periods of 3 hours)
        upcoming_forecasts = []
        for item in data.get("list", [])[:8]:
            rain_mm = item.get("rain", {}).get("3h", 0)
            upcoming_forecasts.append({
                "timestamp": item.get("dt_txt"),
                "temp_c": item.get("main", {}).get("temp"),
                "rain_3h_mm": rain_mm,
                "description": item.get("weather", [{}])[0].get("description", "Unknown")
            })
            
        return {
            "city": data.get("city", {}).get("name", "Unknown"),
            "upcoming_forecasts": upcoming_forecasts
        }
    except Exception as e:
        print(f"Error fetching weather forecast: {e}")
        return {"error": f"Failed to fetch weather data: {str(e)}"}
