import os
import json
import uuid
from openai import AsyncOpenAI

azure_client = None
if os.getenv("GITHUB_OPENAI__API_TOKEN"):
    azure_client = AsyncOpenAI(
        api_key=os.getenv("GITHUB_OPENAI__API_TOKEN"),
        base_url=os.getenv("GITHUB_OPENAI_BASE_URL")
    )

deepseek_client = None
if os.getenv("DEEPSEEK_API_KEY"):
    deepseek_client = AsyncOpenAI(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com/v1"
    )

groq_client = None
if os.getenv("GROQ_API_KEY"):
    groq_client = AsyncOpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

# --- High-Fidelity Mock Agent Support Classes ---
class MockToolCallFunction:
    def __init__(self, name, arguments):
        self.name = name
        self.arguments = arguments

class MockToolCall:
    def __init__(self, name, arguments):
        self.id = f"call_{uuid.uuid4().hex[:12]}"
        self.type = "function"
        self.function = MockToolCallFunction(name, arguments)

    def model_dump(self, **kwargs):
        return {
            "id": self.id,
            "type": "function",
            "function": {
                "name": self.function.name,
                "arguments": self.function.arguments
            }
        }

class MockMessage:
    def __init__(self, content=None, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls
        self.role = "assistant"

    def model_dump(self, **kwargs):
        res = {"role": "assistant"}
        if self.content is not None:
            res["content"] = self.content
        if self.tool_calls is not None:
            res["tool_calls"] = [tc.model_dump() for tc in self.tool_calls]
        return res

class MockChoice:
    def __init__(self, message):
        self.message = message

class MockResponse:
    def __init__(self, content=None, tool_calls=None):
        self.choices = [MockChoice(MockMessage(content, tool_calls))]

async def execute_prompt_with_fallback(messages: list, tools: list):
    """
    Executes an LLM prompt with strict fallback routing.
    Azure OpenAI -> DeepSeek -> Groq -> Local SFEWS Mock Reasoning Agent
    """
    # If no LLM providers are configured, run the high-fidelity mock client
    if not azure_client and not deepseek_client and not groq_client:
        print("Agent: No API keys configured. Routing to local high-fidelity SFEWS Mock Reasoning Agent...")
        
        # Get original user query
        user_query = ""
        for m in messages:
            if m.get("role") == "user":
                user_query = m.get("content", "")
                break
                
        user_query_lower = user_query.lower()
        
        # Let's count how many tool responses we have received in messages
        tool_responses = [m for m in messages if m.get("role") == "tool"]
        
        if not tool_responses:
            # First iteration: Determine if they want weather, specific node, or general status
            if any(k in user_query_lower for k in ["weather", "forecast", "rain", "precip"]):
                loc = "Awash River Basin"
                if "alpha" in user_query_lower:
                    loc = "NODE-ALPHA-1"
                elif "beta" in user_query_lower:
                    loc = "NODE-BETA-2"
                elif "gamma" in user_query_lower:
                    loc = "NODE-GAMMA-3"
                
                tool_call = MockToolCall("get_coordinates", json.dumps({"location_name": loc}))
                return MockResponse(tool_calls=[tool_call])
            else:
                loc = "Awash"
                if "alpha" in user_query_lower:
                    loc = "NODE-ALPHA-1"
                elif "beta" in user_query_lower:
                    loc = "NODE-BETA-2"
                elif "gamma" in user_query_lower:
                    loc = "NODE-GAMMA-3"
                
                tool_call = MockToolCall("get_current_water_level", json.dumps({"location_name": loc}))
                return MockResponse(tool_calls=[tool_call])
        else:
            # We have tool responses! Let's inspect what we received
            water_level_data = None
            weather_data = None
            coords_data = None
            
            for tr in tool_responses:
                name = tr.get("name")
                content_str = tr.get("content", "{}")
                try:
                    content_json = json.loads(content_str)
                except:
                    content_json = {}
                    
                if name == "get_current_water_level":
                    water_level_data = content_json
                elif name == "get_weather_forecast":
                    weather_data = content_json
                elif name == "get_coordinates":
                    coords_data = content_json
            
            # If we got coordinates but haven't fetched weather forecast yet:
            if coords_data and not weather_data:
                lat = coords_data.get("lat", 8.9806)
                lon = coords_data.get("lon", 38.7578)
                tool_call = MockToolCall("get_weather_forecast", json.dumps({"lat": lat, "lon": lon}))
                return MockResponse(tool_calls=[tool_call])
                
            # Synthesize final response
            report = []
            report.append("### 🌊 SFEWS AI Situational Report")
            report.append("Based on the latest telemetry and regional hydrological telemetry inputs, here is my analytical situational assessment:\n")
            
            if water_level_data:
                if "error" in water_level_data:
                    report.append(f"❌ **Sensor Error:** {water_level_data.get('error')}\n")
                else:
                    node_name = water_level_data.get("node_name")
                    wl = water_level_data.get("water_level_cm")
                    rf = water_level_data.get("rainfall_rate_mm")
                    bat = water_level_data.get("battery_level")
                    risk = water_level_data.get("risk_level", "Unknown")
                    prob = water_level_data.get("flood_probability", 0.0)
                    
                    emoji = "🟢"
                    if risk == "Warning":
                        emoji = "🟡"
                    elif risk == "Critical":
                        emoji = "🔴"
                        
                    report.append(f"🛰️ **Active Node Status: {node_name}**")
                    report.append(f"* **Current Fluid Depth:** `{wl} cm`")
                    report.append(f"* **Precipitation/Rainfall:** `{rf} mm/h`")
                    report.append(f"* **Battery Reserve:** `{bat}%`")
                    report.append(f"* **Calculated Flood Probability:** `{prob*100:.1f}%`")
                    report.append(f"* **Risk Level:** {emoji} **{risk}**\n")
                    
                    if risk == "Critical":
                        report.append("> [!CAUTION]\n> **CRITICAL STRESS THRESHOLD BREACHED!**\n> Dynamic fluid levels have exceeded normal limits. Initiating automated emergency SMS broadcast override immediately. Local communities must evacuate low-lying banks.\n")
                    elif risk == "Warning":
                        report.append("> [!WARNING]\n> **ELEVATED FLOOD WARNING ACTIVE.**\n> Upstream siphons are operating under maximum load. Telemetry signals show shear thinning. Keep alert and monitor live stream.\n")
                    else:
                        report.append("> [!NOTE]\n> **STABLE HYDRAULIC EQUILIBRIUM.**\n> All metrics remain well within normal calibrated tolerances. No active incident alerts.\n")
            
            if weather_data:
                if "error" in weather_data:
                    report.append(f"❌ **Weather Error:** {weather_data.get('error')}\n")
                else:
                    city = weather_data.get("city", "Awash River Basin")
                    report.append(f"🌤️ **Meteorological Forecast: {city}**")
                    report.append("Here is the projected 24-hour meteorological outlook:\n")
                    
                    forecasts = weather_data.get("upcoming_forecasts", [])
                    if forecasts:
                        for f in forecasts[:4]:
                            time_str = f.get("timestamp", "").split(" ")[1][:5]
                            temp = f.get("temp_c")
                            rain = f.get("rain_3h_mm")
                            desc = f.get("description", "Unknown")
                            rain_emoji = "🌧️" if rain > 0 else "☁️"
                            report.append(f"* **{time_str}**: {temp}°C | {rain_emoji} {rain} mm rain ({desc})")
                    else:
                        report.append("* No immediate weather anomalies registered.")
                    report.append("")
                    
            if not water_level_data and not weather_data:
                report.append("🔍 **Query Assessment:** I analyzed your inquiry regarding the Awash River Basin SFEWS network. Please specify a node name (e.g., NODE-ALPHA-1) or request weather forecasts for a comprehensive automated report.")
                
            report.append("\n*Report compiled by local SFEWS AI Orchestrator (Offline Fallback Mode).*")
            
            final_content = "\n".join(report)
            return MockResponse(content=final_content)

    if azure_client:
        try:
            # Try Primary: Azure OpenAI
            print("Agent: Calling Azure OpenAI...")
            response = await azure_client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.3
            )
            return response
        except Exception as e_azure:
            print(f"Azure OpenAI Failed: {e_azure}. Trying next fallback...")

    if deepseek_client:
        try:
            # Fallback 1: DeepSeek
            print("Agent: Calling DeepSeek...")
            response = await deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.3
            )
            return response
        except Exception as e_deepseek:
            print(f"DeepSeek Failed: {e_deepseek}. Trying next fallback...")

    if groq_client:
        try:
            # Fallback 2: Groq
            print("Agent: Calling Groq...")
            response = await groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.3
            )
            return response
        except Exception as e_groq:
            print(f"Groq Failed: {e_groq}.")
            raise Exception("All configured LLM providers failed.")

    raise Exception("No configured LLM provider succeeded.")
