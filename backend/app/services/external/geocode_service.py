import os
import logging
import httpx
from typing import Dict
from ...core.circuit_breaker import geocode_breaker

logger = logging.getLogger("sfews.geocode")

MOCK_REGISTRY = {
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

def _fallback_geocode(location_name: str) -> Dict:
    loc_clean = location_name.lower()
    for key, coords in MOCK_REGISTRY.items():
        if key in loc_clean:
            return coords
    return {"lat": 8.9806, "lon": 38.7578, "display_name": f"{location_name} (SFEWS Grid Mock), Ethiopia"}

async def _fetch_live_locationiq(location_name: str, api_key: str) -> Dict:
    url = f"https://us1.locationiq.com/v1/search.php?key={api_key}&q={location_name}&format=json"
    async with httpx.AsyncClient(timeout=3.5) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()

    if data and len(data) > 0:
        first = data[0]
        return {
            "lat": float(first.get("lat")),
            "lon": float(first.get("lon")),
            "display_name": first.get("display_name")
        }
    return _fallback_geocode(location_name)

async def get_coordinates(location_name: str) -> Dict:
    """
    Fetches latitude and longitude for a given location name using LocationIQ.
    Protected by Circuit Breaker pattern with immediate in-memory fallback.
    """
    api_key = os.getenv("LOCATIONIQ_API_KEY")
    if not api_key:
        return _fallback_geocode(location_name)

    try:
        return await geocode_breaker.call_async(
            _fetch_live_locationiq,
            location_name=location_name,
            api_key=api_key,
            fallback=lambda *args, **kwargs: _fallback_geocode(location_name)
        )
    except Exception as exc:
        logger.warning(f"[GeocodeService] Circuit breaker prevented hang: {exc}")
        return _fallback_geocode(location_name)
