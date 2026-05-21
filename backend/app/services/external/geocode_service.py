import os
import httpx
from typing import Dict, Optional

async def get_coordinates(location_name: str) -> Dict:
    """
    Fetches latitude and longitude for a given location name using LocationIQ.
    """
    api_key = os.getenv("LOCATIONIQ_API_KEY")
    if not api_key:
        print("Warning: LOCATIONIQ_API_KEY is not set.")
        return {"error": "LocationIQ API key is not configured."}

    url = f"https://us1.locationiq.com/v1/search.php?key={api_key}&q={location_name}&format=json"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            response.raise_for_status()
            data = response.json()
        
        if data and len(data) > 0:
            first_result = data[0]
            return {
                "lat": float(first_result.get("lat")),
                "lon": float(first_result.get("lon")),
                "display_name": first_result.get("display_name")
            }
        return {"error": f"No coordinates found for location: {location_name}"}
    except Exception as e:
        print(f"Error fetching coordinates: {e}")
        return {"error": f"Failed to fetch coordinates: {str(e)}"}
