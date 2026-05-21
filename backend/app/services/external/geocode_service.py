import os
import httpx
from typing import Dict, Optional

async def get_coordinates(location_name: str) -> Dict:
    """
    Fetches latitude and longitude for a given location name using LocationIQ.
    """
    api_key = os.getenv("LOCATIONIQ_API_KEY")
    
    # High-fidelity mock fallback registry for local testing & simulations in Awash Basin, Ethiopia
    mock_registry = {
        "birampur": {"lat": 8.8532, "lon": 39.0211, "display_name": "Birampur Area (Awash Melka), Ethiopia"},
        "melka": {"lat": 8.8532, "lon": 39.0211, "display_name": "Birampur Area (Awash Melka), Ethiopia"},
        "alpha": {"lat": 8.8532, "lon": 39.0211, "display_name": "Birampur Area (Awash Melka), Ethiopia"},
        "sundarganj": {"lat": 8.5412, "lon": 39.2783, "display_name": "Sundarganj Station (Adama), Ethiopia"},
        "adama": {"lat": 8.5412, "lon": 39.2783, "display_name": "Sundarganj Station (Adama), Ethiopia"},
        "beta": {"lat": 8.5412, "lon": 39.2783, "display_name": "Sundarganj Station (Adama), Ethiopia"},
        "chirbandar": {"lat": 8.6015, "lon": 39.1245, "display_name": "Chirbandar Station (Modjo), Ethiopia"},
        "modjo": {"lat": 8.6015, "lon": 39.1245, "display_name": "Chirbandar Station (Modjo), Ethiopia"},
        "gamma": {"lat": 8.6015, "lon": 39.1245, "display_name": "Chirbandar Station (Modjo), Ethiopia"},
        "phulbari": {"lat": 8.4329, "lon": 39.0912, "display_name": "Phulbari Station (Koka), Ethiopia"},
        "koka": {"lat": 8.4329, "lon": 39.0912, "display_name": "Phulbari Station (Koka), Ethiopia"},
        "kaharole": {"lat": 8.7845, "lon": 39.4421, "display_name": "Kaharole Station (Welenchiti), Ethiopia"},
        "welenchiti": {"lat": 8.7845, "lon": 39.4421, "display_name": "Kaharole Station (Welenchiti), Ethiopia"},
        "awash": {"lat": 8.9806, "lon": 38.7578, "display_name": "Awash River Basin Command Center, Ethiopia"},
        "ethiopia": {"lat": 9.145, "lon": 40.4896, "display_name": "Awash River Basin, Ethiopia"}
    }
    
    if not api_key:
        print("Warning: LOCATIONIQ_API_KEY is not set. Using local mock coordinates database.")
        loc_clean = location_name.lower()
        for key, coords in mock_registry.items():
            if key in loc_clean:
                return coords
        # Default global backup
        return {"lat": 8.9806, "lon": 38.7578, "display_name": f"{location_name} (SFEWS Grid Mock), Ethiopia"}

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
