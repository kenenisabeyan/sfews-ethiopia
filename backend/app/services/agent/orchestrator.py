import json
import asyncio
from .llm_client import execute_prompt_with_fallback
from .tools import TOOLS_SCHEMA, get_current_water_level
from ..external.weather_service import get_weather_forecast
from ..external.geocode_service import get_coordinates

# Tool execution mapper
AVAILABLE_TOOLS = {
    "get_current_water_level": get_current_water_level,
    "get_weather_forecast": get_weather_forecast,
    "get_coordinates": get_coordinates
}

SYSTEM_PROMPT = """You are the SFEWS Command Center AI Assistant. 
You provide real-time situational awareness regarding flood risks.
You are strictly READ-ONLY. You cannot change database values.
If the user asks about a location, use your tools to find coordinates, weather, and sensor data.
Provide concise, professional emergency reports."""

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
                        function_args = json.loads(tool_call.function.arguments)
                        print(f"Agent executing tool: {function_name} with args: {function_args}")
                        
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
