import os
from agents import (
    Agent,
    Runner,
    AsyncOpenAI,
    OpenAIChatCompletionsModel,
    set_tracing_disabled,
    AgentOutputSchema
)
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

gemini_api_key = os.getenv("GEMINI_API_KEY")
set_tracing_disabled(disabled=True)


# =========================
# Output Schema
# =========================
class CampaignOutput(BaseModel):
    campaign_title_suggestion: str = Field(
        description="A strong and creative campaign title aligned with the client objective."
    )
    headline_options: list[str] = Field(
        description="Exactly 3 marketing headline options for ads, landing pages, or social creatives."
    )
    tone_of_voice_guide: str = Field(
        description="A short guide describing the communication tone, messaging style, and brand voice."
    )
    recommended_channels: list[str] = Field(
        description="Marketing channels best suited for this campaign, such as Meta Ads, Google Search, YouTube, LinkedIn, or Email."
    )
    budget_allocation_percentages: dict[str, float] = Field(
        description="Budget split percentages across channels. Total should be close to 100."
    )
    key_visual_direction: str = Field(
        description="A detailed hero visual concept including imagery style, composition, subject focus, and emotional direction."
    )


# =========================
# Agent Instructions
# =========================
AGENT_INSTRUCTION = """
You are a senior advertising campaign strategist working in a digital agency.

The user will provide:
1. Client details (name, industry, website, competitors)
2. Campaign objective (awareness, consideration, conversion)
3. Target audience
4. Campaign budget
5. Creative preferences (tone, imagery style, color direction, do's and don'ts)

Your task:
Generate a professional campaign brief output.

IMPORTANT RULES:
- Always create exactly 3 headline options
- Recommend the best channels based on campaign objective
- Provide realistic budget percentages summing to 100
- Visual direction should describe a strong hero image concept
- Output must be structured according to the provided schema
- Keep output agency-grade and presentation-ready
"""


# =========================
# LLM Client
# =========================
external_client = AsyncOpenAI(
    api_key=gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    timeout=180.0,
    max_retries=3,
)

llm_model = OpenAIChatCompletionsModel(
    model="gemini-2.5-flash",
    openai_client=external_client,
)


# =========================
# Agent
# =========================
campaign_agent = Agent(
    name="campaign_agent",
    instructions=AGENT_INSTRUCTION,
    model=llm_model,
    output_type=AgentOutputSchema(CampaignOutput, strict_json_schema=False),
)


# =========================
# User Prompt Example
# =========================
# user_prompt = """
# {'campaign_name': 'bike_launch_2026', 'client': 'hero_motocorp', 'industry': 'Automotive', 'website': 'https://heromotocorp.com', 'key_competitors': ['bajaj', 'tvs', 'yamaha'], 'objective': 'awareness', 'target_audience': {'devices': ['smartphones', 'laptops'], 'location': ['india'], 'interests': ['bikes', 'cars', 'sports'], 'demographics': '18-45 years old'}, 'creative_preference': {'dos': ['add red color'], 'tone': 'asfdasdf', 'donts': ['don't add blue color'], 'imagery_style': 'bike_launch', 'color_direction': ['red']}, 'budget': Decimal('323.00')} 
# """


# # =========================
# # Run
# # =========================
# result = Runner.run_sync(campaign_agent, user_prompt)

# print("\n=== AI CAMPAIGN OUTPUT ===\n")
# print(result.final_output)


# # optamized output
# print("\n=== OPTIMIZED OUTPUT ===\n")

# print("Title:", result.final_output.campaign_title_suggestion)

# print("\nHeadlines:")
# for headline in result.final_output.headline_options:
#     print("-", headline)

# print("\nTone:", result.final_output.tone_of_voice_guide)

# print("\nRecommended Channels:")
# for channel in result.final_output.recommended_channels:
#     print("-", channel)

# print("\nBudget Allocation:")
# for channel, percentage in result.final_output.budget_allocation_percentages.items():
#     print(f"- {channel}: {percentage}%")

# print("\nKey Visual Direction:", result.final_output.key_visual_direction)