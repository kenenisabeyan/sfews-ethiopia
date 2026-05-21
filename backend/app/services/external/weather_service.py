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
        print("Warning: OPEN_WEATHER_API_KEY is not set. Using local weather forecast simulator.")
        import datetime
        now = datetime.datetime.now()
        upcoming_forecasts = []
        for i in range(8):
            future_time = now + datetime.timedelta(hours=i*3)
            # Simulate a rainy climate scenario suitable for flood alert testing
            temp = round(21.5 + (i % 3) * 1.5, 1)
            rain_mm = round(1.5 + (i % 2) * 5.5 if i < 4 else 0.0, 1)
            desc = "Moderate Rain" if rain_mm > 0 else "Overcast Clouds"
            upcoming_forecasts.append({
                "timestamp": future_time.strftime("%Y-%m-%d %H:%M:%S"),
                "temp_c": temp,
                "rain_3h_mm": rain_mm,
                "description": desc
            })
        return {
            "city": "Upper Awash Basin SFEWS Grid",
            "upcoming_forecasts": upcoming_forecasts
        }

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
