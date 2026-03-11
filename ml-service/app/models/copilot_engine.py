"""Google Gemini-powered compliance copilot engine."""

import google.generativeai as genai

from app.config import settings

SYSTEM_PROMPT = """You are PrithviNET Compliance Copilot, an AI assistant for environmental
monitoring and compliance in India. You help Regional Officers and administrators understand
pollution data, predict risks, and evaluate what-if scenarios.

You have access to the following context about the current environmental situation:
- Industry details, emission records, and compliance history
- Prescribed limits per CPCB/SPCB standards (NAAQS for air, IS:2296 for water, noise rules)
- Recent sensor readings and anomaly flags
- Regional risk assessments

When answering:
1. Be specific — cite actual values, thresholds, and percentages
2. For what-if queries, explain your reasoning step by step
3. Flag any assumptions you make
4. Recommend concrete actions when appropriate
5. Use Indian regulatory context (CPCB, SPCB, Environment Protection Act 1986)
"""


def _configure_gemini() -> None:
    """Configure Gemini API key (idempotent)."""
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)


async def query_copilot(question: str, context: dict) -> dict:
    """Send a contextual query to Gemini and return structured response.

    Args:
        question: The user's compliance question.
        context: Structured context dict injected by Express
                 (industries, readings, limits, alerts, etc.).

    Returns:
        Dict with answer, confidence, and citations.
    """
    _configure_gemini()

    model = genai.GenerativeModel("gemini-1.5-flash")
    context_str = format_context(context)
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"--- CONTEXT ---\n{context_str}\n\n"
        f"--- QUESTION ---\n{question}"
    )

    response = await model.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            max_output_tokens=1024,
        ),
    )

    return {
        "answer": response.text,
        "confidence": 0.85,  # placeholder; could derive from model metadata
        "citations": extract_citations(context),
    }


def format_context(context: dict) -> str:
    """Convert structured context dict to readable text for the LLM.

    Args:
        context: Dict with optional keys: industry, recent_readings, limits, alerts.

    Returns:
        Human-readable context string.
    """
    parts: list[str] = []

    if "industry" in context:
        ind = context["industry"]
        parts.append(
            f"Industry: {ind.get('name', 'N/A')} ({ind.get('type', 'N/A')}), "
            f"Status: {ind.get('status', 'N/A')}"
        )

    if "recent_readings" in context:
        for r in context["recent_readings"][:20]:
            parts.append(
                f"  {r.get('parameter', '?')}: {r.get('value', '?')} "
                f"{r.get('unit', '')} at {r.get('timestamp', '?')}"
            )

    if "limits" in context:
        for lim in context["limits"]:
            parts.append(
                f"  Limit for {lim.get('parameter', '?')}: "
                f"max {lim.get('max_value', '?')} {lim.get('unit', '')}"
            )

    if "alerts" in context:
        parts.append(f"Active alerts: {len(context['alerts'])}")

    return "\n".join(parts) if parts else "No additional context provided."


def extract_citations(context: dict) -> list[str]:
    """Pull data sources referenced in the context.

    Args:
        context: The same context dict passed to the copilot.

    Returns:
        List of citation strings.
    """
    citations: list[str] = []

    if "industry" in context:
        citations.append(f"Industry: {context['industry'].get('name', 'N/A')}")

    if "recent_readings" in context:
        count = len(context["recent_readings"])
        citations.append(f"Readings: {count} recent observations")

    if "limits" in context:
        citations.append(f"Prescribed limits: {len(context['limits'])} parameters")

    return citations
