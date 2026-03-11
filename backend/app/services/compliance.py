"""
AI Compliance Copilot service using Google Gemini.
Provides what-if scenario analysis and policy recommendations.
"""

import logging
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.station import MonitoringStation
from app.models.timeseries import TimeSeriesData
from app.models.alert import Alert
from app.schemas.compliance import ComplianceQuery, ComplianceResponse
from app.services.aqi_calculator import calculate_aqi, NOISE_LIMITS, WATER_LIMITS

logger = logging.getLogger(__name__)


def run_simulation(
    db: Session,
    query: ComplianceQuery,
) -> ComplianceResponse:
    """
    Run an AI-powered compliance simulation using Google Gemini.
    """
    # 1. Gather context about the station
    context = _build_context(db, query)

    # 2. Try calling Gemini
    try:
        analysis = _call_gemini(query.query, context)
        return ComplianceResponse(
            analysis=analysis["analysis"],
            predicted_impact=analysis.get("predicted_impact"),
            recommendations=analysis.get("recommendations", []),
            affected_stations=analysis.get("affected_stations", []),
        )
    except Exception as e:
        logger.warning(f"Gemini call failed: {e}. Using rule-based fallback.")
        return _rule_based_fallback(db, query, context)


def _build_context(db: Session, query: ComplianceQuery) -> dict:
    """Build environmental context for the AI model."""
    context = {"query": query.query}

    if query.station_id:
        station = (
            db.query(MonitoringStation)
            .filter(MonitoringStation.station_id == query.station_id)
            .first()
        )
        if station:
            context["station"] = {
                "id": station.station_id,
                "name": station.station_name,
                "city": station.city,
                "state": station.state,
                "zone_type": station.zone_type,
                "capabilities": station.monitoring_capabilities,
            }

            # Get recent averages (last 7 days)
            end = datetime.now(timezone.utc)
            start = end - timedelta(days=7)

            recent = (
                db.query(
                    func.avg(TimeSeriesData.aqi_pm25).label("avg_pm25"),
                    func.avg(TimeSeriesData.aqi_pm10).label("avg_pm10"),
                    func.avg(TimeSeriesData.aqi_so2).label("avg_so2"),
                    func.avg(TimeSeriesData.aqi_no2).label("avg_no2"),
                    func.avg(TimeSeriesData.aqi_co).label("avg_co"),
                    func.avg(TimeSeriesData.aqi_o3).label("avg_o3"),
                    func.avg(TimeSeriesData.noise_leq).label("avg_noise"),
                    func.avg(TimeSeriesData.water_ph).label("avg_ph"),
                    func.avg(TimeSeriesData.water_bod).label("avg_bod"),
                    func.avg(TimeSeriesData.weather_temp).label("avg_temp"),
                    func.avg(TimeSeriesData.weather_humidity).label("avg_humidity"),
                    func.avg(TimeSeriesData.weather_wind_speed).label("avg_wind"),
                )
                .filter(
                    TimeSeriesData.station_id == query.station_id,
                    TimeSeriesData.timestamp >= start,
                )
                .first()
            )

            if recent:
                context["current_readings"] = {
                    "pm25": round(recent.avg_pm25, 1) if recent.avg_pm25 else None,
                    "pm10": round(recent.avg_pm10, 1) if recent.avg_pm10 else None,
                    "so2": round(recent.avg_so2, 1) if recent.avg_so2 else None,
                    "no2": round(recent.avg_no2, 1) if recent.avg_no2 else None,
                    "co": round(recent.avg_co, 2) if recent.avg_co else None,
                    "o3": round(recent.avg_o3, 1) if recent.avg_o3 else None,
                    "noise_leq": round(recent.avg_noise, 1) if recent.avg_noise else None,
                    "water_ph": round(recent.avg_ph, 2) if recent.avg_ph else None,
                    "water_bod": round(recent.avg_bod, 1) if recent.avg_bod else None,
                    "temperature": round(recent.avg_temp, 1) if recent.avg_temp else None,
                    "humidity": round(recent.avg_humidity, 1) if recent.avg_humidity else None,
                    "wind_speed": round(recent.avg_wind, 1) if recent.avg_wind else None,
                }

                # Compute current AQI
                aqi_result = calculate_aqi(
                    pm25=recent.avg_pm25,
                    pm10=recent.avg_pm10,
                    so2=recent.avg_so2,
                    no2=recent.avg_no2,
                    co=recent.avg_co,
                    o3=recent.avg_o3,
                )
                context["current_aqi"] = aqi_result

            # Active alerts count
            alert_count = (
                db.query(func.count(Alert.alert_id))
                .filter(Alert.station_id == query.station_id, Alert.status == "Active")
                .scalar()
            ) or 0
            context["active_alerts"] = alert_count

    # Noise limits
    context["noise_limits"] = NOISE_LIMITS
    context["water_limits"] = WATER_LIMITS

    return context


def _call_gemini(user_query: str, context: dict) -> dict:
    """Call Google Gemini API with environmental context."""
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY not configured")

    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    system_prompt = """You are PrithviNet's Environmental Compliance Copilot, an AI assistant
specialized in environmental monitoring, pollution analysis, and regulatory compliance in India.

You have access to real-time monitoring data from CPCB stations across India. Your role is to:
1. Analyze environmental data and identify compliance issues
2. Simulate what-if scenarios for policy interventions
3. Predict the environmental impact of proposed changes
4. Provide actionable recommendations based on CPCB/NAAQS standards

Indian AQI Categories: Good(0-50), Satisfactory(51-100), Moderate(101-200), Poor(201-300), Very Poor(301-400), Severe(401-500)
Noise Limits (dB): Industrial Day:75/Night:70, Commercial Day:65/Night:55, Residential Day:55/Night:45, Silence Day:50/Night:40
Water Standards: pH 5.5-9.0, BOD ≤30 mg/L, COD ≤250 mg/L, TSS ≤100 mg/L

Respond in JSON format with:
{
  "analysis": "Detailed analysis text (2-4 paragraphs)",
  "predicted_impact": {"parameter": "value change description", ...},
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "affected_stations": ["station names that may be affected"]
}"""

    context_str = json.dumps(context, indent=2, default=str)
    prompt = f"""STATION CONTEXT:\n{context_str}\n\nUSER QUERY:\n{user_query}"""

    response = model.generate_content(
        [system_prompt, prompt],
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.7,
        ),
    )

    try:
        result = json.loads(response.text)
    except json.JSONDecodeError:
        result = {
            "analysis": response.text,
            "recommendations": [],
            "affected_stations": [],
        }

    return result


def _rule_based_fallback(
    db: Session,
    query: ComplianceQuery,
    context: dict,
) -> ComplianceResponse:
    """Simple rule-based fallback when Gemini is not available."""
    readings = context.get("current_readings", {})
    station_info = context.get("station", {})
    aqi_info = context.get("current_aqi", {})

    analysis_parts = []
    recommendations = []

    station_name = station_info.get("name", "the selected station")
    zone = station_info.get("zone_type", "Unknown")

    # AQI analysis
    current_aqi = aqi_info.get("aqi")
    if current_aqi:
        category = aqi_info.get("category", "Unknown")
        prominent = aqi_info.get("prominent_pollutant", "PM2.5")
        analysis_parts.append(
            f"Station '{station_name}' currently has an AQI of {current_aqi} ({category}). "
            f"The prominent pollutant is {prominent}."
        )

        if query.change_percent and query.parameter:
            param_name = query.parameter.replace("aqi_", "").upper()
            current_val = readings.get(query.parameter.replace("aqi_", ""), 0) or 0
            new_val = current_val * (1 + query.change_percent / 100)
            analysis_parts.append(
                f"If {param_name} changes by {query.change_percent:+.0f}% "
                f"(from {current_val:.1f} to {new_val:.1f} ug/m3), "
                f"the AQI would likely change proportionally."
            )

        if current_aqi > 200:
            recommendations.append("Immediate action required: AQI exceeds 'Poor' threshold")
            recommendations.append("Consider issuing public health advisory for sensitive groups")
            recommendations.append("Review emission sources in the monitoring area")
        elif current_aqi > 100:
            recommendations.append("Monitor closely: AQI is in 'Moderate' range")
            recommendations.append("Ensure industrial units maintain emission standards")

    # Noise analysis
    noise = readings.get("noise_leq")
    if noise and zone in NOISE_LIMITS:
        day_limit = NOISE_LIMITS[zone]["day"]
        if noise > day_limit:
            analysis_parts.append(
                f"Noise level ({noise:.1f} dB) exceeds the {zone} zone day limit of {day_limit} dB."
            )
            recommendations.append(f"Noise reduction measures needed to meet {zone} zone standards")

    # Water analysis
    ph = readings.get("water_ph")
    if ph:
        if ph < 5.5 or ph > 9.0:
            analysis_parts.append(f"Water pH ({ph:.2f}) is outside the permissible range of 5.5-9.0.")
            recommendations.append("Investigate water treatment processes for pH correction")

    if not analysis_parts:
        analysis_parts.append(
            f"Analysis for station '{station_name}': Insufficient data for detailed analysis. "
            "Please ensure the station has recent monitoring data."
        )

    if not recommendations:
        recommendations.append("Continue regular monitoring")
        recommendations.append("Review compliance status periodically")

    return ComplianceResponse(
        analysis=" ".join(analysis_parts),
        predicted_impact={"note": "Detailed prediction requires AI model (Gemini API key not configured)"},
        recommendations=recommendations,
        affected_stations=[],
    )
