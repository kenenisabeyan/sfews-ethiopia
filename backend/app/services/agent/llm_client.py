import os
from openai import AsyncOpenAI

# Initialize clients (they will only succeed if the API keys are present)
# Azure OpenAI (Primary)
azure_client = AsyncOpenAI(
    api_key=os.getenv("GITHUB_OPENAI__API_TOKEN"),
    base_url=os.getenv("GITHUB_OPENAI_BASE_URL")
)

# DeepSeek (Fallback 1)
deepseek_client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/v1"
)

# Groq (Fallback 2)
groq_client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

async def execute_prompt_with_fallback(messages: list, tools: list):
    """
    Executes an LLM prompt with strict fallback routing.
    Azure OpenAI -> DeepSeek -> Groq
    """
    try:
        # Try Primary: Azure OpenAI
        print("Agent: Calling Azure OpenAI...")
        response = await azure_client.chat.completions.create(
            model="gpt-4o",  # Standard Azure OpenAI model name, adjust if deployment name differs
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=0.3
        )
        return response
    except Exception as e_azure:
        print(f"Azure OpenAI Failed: {e_azure}. Falling back to DeepSeek...")
        try:
            # Fallback 1: DeepSeek
            response = await deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.3
            )
            return response
        except Exception as e_deepseek:
            print(f"DeepSeek Failed: {e_deepseek}. Falling back to Groq...")
            try:
                # Fallback 2: Groq
                response = await groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",  # Active replacement for decommissioned llama3-70b
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.3
                )
                return response
            except Exception as e_groq:
                print(f"Groq Failed: {e_groq}.")
                raise Exception("All LLM providers failed due to rate limits or connection errors.")
