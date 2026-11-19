import json
import asyncio
from .llm_client import execute_prompt_with_fallback
from .tools import TOOLS_SCHEMA, get_current_water_level, get_basin_flood_summary
from ..external.weather_service import get_weather_forecast
from ..external.geocode_service import get_coordinates

# Tool execution mapper
AVAILABLE_TOOLS = {
    "get_current_water_level": get_current_water_level,
    "get_basin_flood_summary": get_basin_flood_summary,
    "get_weather_forecast": get_weather_forecast,
    "get_coordinates": get_coordinates
}

SYSTEM_PROMPT = """You are the SFEWS Command Center AI Assistant. 
You provide real-time situational awareness regarding flood risks in Ethiopia (specifically the Awash River Basin).
You are strictly READ-ONLY. You cannot change database values.
Use your tools to find coordinates, weather forecasts, sensor water levels, and basin summaries.
Provide concise, professional civil defense reports."""

async def run_agent(query: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": query}
    ]

    max_iterations = 5
    for i in range(max_iterations):
        response = await execute_prompt_with_fallback(messages, TOOLS_SCHEMA)
        response_message = response.choices[0].message
        
        # If the LLM has a text response, it's done!
        if response_message.content and not response_message.tool_calls:
            return response_message.content

        # If it wants to use tools
        if response_message.tool_calls:
            messages.append(response_message.model_dump(exclude_none=True))
            
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_to_call = AVAILABLE_TOOLS.get(function_name)
                
                if function_to_call:
                    try:
                        function_args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
                        
                        if function_name == "get_weather_forecast":
                            function_response = await function_to_call(
                                lat=function_args.get("lat"),
                                lon=function_args.get("lon")
                            )
                        elif function_name == "get_coordinates":
                            function_response = await function_to_call(
                                location_name=function_args.get("location_name")
                            )
                        elif function_name == "get_current_water_level":
                            function_response = await asyncio.to_thread(
                                function_to_call, 
                                location_name=function_args.get("location_name")
                            )
                        elif function_name == "get_basin_flood_summary":
                            function_response = await asyncio.to_thread(
                                function_to_call,
                                basin_name=function_args.get("basin_name", "Awash")
                            )
                        else:
                            function_response = {"error": "Unknown function"}

                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps(function_response)
                        })
                    except Exception as e:
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps({"error": str(e)})
                        })

    return "I reached my maximum reasoning steps and could not formulate a complete answer. Please try again."
