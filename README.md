# 🏠 AI Smart Home Automation

A self-hosted AI-powered home automation system running on **n8n**, designed for a religious Jewish household. The system manages climate control, window blinds, and appliance scheduling with full awareness of Shabbat/Holiday halachic constraints.

> Built as a portfolio project demonstrating AI agent orchestration, IoT integration, and real-world automation design.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Host                          │
│                                                         │
│  ┌───────────────┐    ┌──────────────┐                  │
│  │ n8n-automation│    │ gmail-relay  │                  │
│  │  Port 5678    │◄──►│  SMTP 2525   │                  │
│  └──────┬────────┘    └──────────────┘                  │
│         │                                               │
│         ▼  web-proxy network                            │
│  ┌──────────────┐                                       │
│  │  Nginx Proxy │──► https://n8n.your-domain.com        │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
         │
         ▼  External APIs
┌────────────────────────────────────────┐
│  • Gemini 2.5 Flash (AI decisions)     │
│  • IMS Israel Meteorological Service   │
│  • Tomorrow.io (weather forecast)      │
│  • Hebcal (Jewish calendar/zmanim)     │
│  • Tuya Cloud (smart devices)          │
└────────────────────────────────────────┘
```

## AI Agents

| # | Agent | Trigger | AI Model | Purpose |
|---|-------|---------|----------|---------|
| 1 | 🌤️ Weather Blinds | Daily 11:00 → waits for Chatzot | Gemini 2.5 Flash | Close blinds if sunny+warm |
| 2 | 🕯️ Erev Shabbat Steward | Daily 15:00 | Gemini 2.5 Flash | Prepare home for Shabbat/holidays |
| 3 | ✡️ Shabbat Day Steward | Daily 00:00 | Gemini 2.5 Flash | Manage devices during Shabbat |
| 4 | 🌙 Kids Sleep Guardian | Hourly 21:00-07:00 | Gemini 2.0 Flash | Maintain kids room temperature |

---

### 1. 🌤️ AI Weather Blinds Control

Automatically closes living room blinds when it's sunny and warm, using real-time solar radiation data from the nearest IMS weather station.

```
Load Config → Hebcal (Chatzot) → Wait → IMS Stations → Find Nearest → Fetch Data → Gemini AI → Close Blinds → Email
```

**Decision factors:** Global radiation (W/m²), temperature, rain, cloudiness percentage — all configurable thresholds.

**Fallbacks:** Weather API fails → keep open. AI fails → seasonal default (summer=close, winter=open).

---

### 2. 🕯️ AI Erev Shabbat Steward

Plans and executes evening actions for Shabbat/Holiday entry. Understands Chol→Kodesh vs Kodesh→Kodesh transitions (multi-day holidays).

```
Load Config → Check Hebcal → Is Erev? → Weather Forecast → Gemini AI Plan → Split → Wait → Execute → Email
```

**Key logic:**
- Chol→Kodesh: Shutdown boiler (30 min before candles) + mini-bar (at candle lighting)
- Kodesh→Kodesh: Skip shutdowns, only plan comfort actions
- Summer: ACs for dinner, bedrooms, kids room

---

### 3. ✡️ AI Shabbat Day Steward

Manages daytime comfort during Shabbat/Chag. Detects Kodesh→Chol transition for havdalah actions.

**Key logic:**
- Turn OFF overnight ACs at 11:00
- Lunch comfort (12:00-14:00), afternoon rest (14:00-sunset)
- Kodesh→Chol: Mini-bar ON at havdalah

---

## Multi-Day Holiday Handling

The system correctly handles complex scenarios like Rosh Hashana + Shabbat (3 consecutive days):

| Day | Time | Agent | Transition | Actions |
|-----|------|-------|------------|---------|
| Wed | 15:00 | Erev | Chol→Kodesh ✅ | Shutdown boiler+minibar, plan evening |
| Thu | 00:00 | Day | No transition | Daytime comfort only |
| Thu | 15:00 | Erev | Kodesh→Kodesh | Evening comfort only (no shutdowns) |
| Fri | 15:00 | Erev | Kodesh→Kodesh | Evening comfort only (no shutdowns) |
| Sat | 00:00 | Day | Kodesh→Chol ✅ | Daytime + Mini-bar ON at havdalah |

---

### 4. 🌙 AI Kids Sleep Climate Guardian

Maintains optimal sleeping temperature for children's room.

| Season | Condition | Action |
|--------|-----------|--------|
| Summer | Outdoor ≥ 17°C | AC ON (cool) |
| Summer | Outdoor < 17°C | AC OFF |
| Winter | Outdoor < 10°C | AC ON (heat) |
| Winter | Outdoor > 12°C | AC OFF |
| Winter | 10-12°C | Maintain (hysteresis) |

---

## Configuration

Single config file at `automation/data/config.json`:

```json
{
  "location": { "latitude": 31.70, "longitude": 34.99 },
  "weather": {
    "cloudyThresholdPercentage": 0.7,
    "coldThresholdCelsius": 20,
    "minRadiationForSunnyWm2": 400,
    "stationSearchCount": 30
  },
  "secrets": { "TUYA_ACCESS_ID", "TUYA_ACCESS_SECRET", "IMS_API_TOKEN", "GEMINI_API_KEY", "TOMORROW_IO_KEY" },
  "devices": { "SHUTTER_LEFT", "SHUTTER_RIGHT", "AC_LIVING_1", "AC_LIVING_2", "AC_BEDROOM", "AC_KIDS", "AC_KITCHEN", "BOILER", "MINI_BAR" },
  "settings": { "NOTIFICATION_EMAIL", "SUMMER_MONTHS", "AC_TEMP_THRESHOLD" },
  "debug": { "mockAI": false, "blinds": {...}, "kids": {...}, "shabbat": {...} }
}
```

All settings are runtime-configurable — no rebuild needed for threshold changes.

### Debug / Mock Mode

Set `"mockAI": true` to skip all Gemini API calls and return configurable mock results per agent. Useful for testing the full flow without consuming AI tokens.

---

## Project Structure

```
automation/
├── docker-compose.yml              # n8n + gmail-relay containers
├── data/config.json                # Unified config (secrets, devices, settings, debug)
├── build-workflow.py               # Build tool: scripts → JSON → n8n import + publish
├── blinds-scripts/                 # Weather blinds agent scripts
│   ├── build-ai-prompt.js
│   ├── calculate-wait-until-chatzot.js
│   ├── close-tuya-blinds.js
│   ├── default-ai-failed.js
│   ├── default-keep-open-safe.js
│   ├── fetch-weather-data-ims.js
│   ├── find-nearest-stations.js
│   ├── get-tuya-token.js
│   ├── parse-ai-response.js
│   └── prepare-email.js
├── shabbat-scripts/                # Shabbat/Holiday agent scripts
│   ├── ai-shabbat-steward.js
│   ├── ai-yom-kodesh-steward.js
│   ├── check-shabbat-entry.js
│   ├── check-yom-kodesh.js
│   ├── get-weather-forecast.js
│   ├── load-config.js
│   ├── split-schedule.js
│   ├── calc-wait-seconds.js
│   ├── execute-single-action.js
│   ├── send-erev-summary-email.js
│   └── send-kodesh-summary-email.js
├── kids-ac-scripts/                # Kids AC agent scripts
│   ├── ai-kids-climate.js
│   ├── check-and-control.js
│   ├── execute-ac-command.js
│   ├── get-current-weather.js
│   └── prepare-morning-email.js
├── gmail-relay/                    # SMTP relay (Gmail OAuth)
├── workflow-blinds-ai.json         # Workflow definitions (source of truth)
├── workflow-shabbat-steward.json
├── workflow-shabbat-day.json
└── workflow-kids-ac.json
```

---

## Deployment

```bash
cd automation/

# Start containers
docker compose up -d

# Deploy workflow changes
python3 build-workflow.py --import          # All workflows
python3 build-workflow.py blinds --import   # Single workflow
```

The build script embeds `.js` scripts into workflow JSONs, imports to n8n, publishes, and restarts.

---

## Technical Highlights

- **AI-driven decisions** — Gemini analyzes real weather data and plans device schedules autonomously
- **Halachic awareness** — Correct handling of Shabbat, multi-day holidays, candle lighting, havdalah
- **Fault tolerance** — Seasonal fallbacks when AI/weather APIs fail, graceful degradation
- **Config-driven** — Single JSON config, runtime-changeable thresholds, no code changes needed
- **Testability** — Global `mockAI` flag skips AI calls for end-to-end testing without token cost
- **Tuya HMAC-SHA256** — Full implementation of Tuya's signed API protocol
- **CI/CD pipeline** — `build-workflow.py` handles script embedding, import, publish, restart

---

## External APIs

| API | Purpose | Auth |
|-----|---------|------|
| [Gemini 2.5 Flash](https://ai.google.dev/) | AI decision engine | API Key |
| [IMS Israel](https://ims.gov.il/) | Real-time solar radiation | API Token |
| [Tomorrow.io](https://tomorrow.io/) | Weather forecast | API Key |
| [Hebcal](https://hebcal.com/) | Jewish calendar, zmanim, holidays | None |
| [Tuya Cloud](https://developer.tuya.com/) | Smart device control | HMAC-SHA256 |
