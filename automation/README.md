# 🏠 AI Smart Home Automation

A self-hosted AI-powered home automation system running on **n8n**, designed for a religious Jewish household. The system manages climate control, window blinds, and appliance scheduling with full awareness of Shabbat/Holiday halachic constraints.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Host                            │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ n8n-automation│    │ gmail-relay  │                   │
│  │  Port 5678   │◄──►│  SMTP 2525   │                   │
│  └──────┬───────┘    └──────────────┘                   │
│         │                                                │
│         │  web-proxy network                             │
│         ▼                                                │
│  ┌──────────────┐                                       │
│  │  NPM (Nginx) │──► https://your-n8n-domain.example.com        │
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

## AI Agents (Workflows)

### 1. 🌤️ AI Weather Blinds Control
**Trigger:** Daily at 11:00 → Waits until Halachic Noon (Chatzot)

Automatically closes living room blinds when it's sunny and warm. Uses real-time solar radiation data from the nearest IMS weather station and sends it to Gemini AI for a go/no-go decision.

**Flow:**
```
Trigger → Hebcal (Chatzot time) → Wait → IMS Weather Data → Gemini AI → Close Blinds → Email Report
```

**Decision factors:**
- Global radiation > 400 W/m² = sunny
- Temperature > 20°C = warm enough to close
- Rain detection
- 70% cloudiness threshold

---

### 2. 🕯️ AI Erev Shabbat Steward
**Trigger:** Daily at 15:00

Prepares the home for Shabbat/Holiday entry. Detects whether tonight is a Chol→Kodesh transition (requires device shutdowns) or Kodesh→Kodesh (multi-day holiday, no shutdowns needed).

**Flow:**
```
Trigger → Load Config → Check Hebcal → Is Erev? → Weather Forecast → Gemini AI Plan → Wait & Execute → Email Summary
```

**Actions:**
- Boiler OFF (30 min before candle lighting) — only on Chol→Kodesh transition
- Mini-Bar OFF (at candle lighting) — only on Chol→Kodesh transition
- Living room ACs ON for Friday night dinner (summer)
- Bedroom/Kids ACs ON for nighttime (summer)

---

### 3. ✡️ AI Shabbat Day Steward
**Trigger:** Daily at 00:00

Manages daytime comfort during Shabbat/Chag. Detects whether today has a Kodesh→Chol transition (havdalah = turn mini-bar back on).

**Flow:**
```
Trigger → Load Config → Check Yom Kodesh → Is Kodesh? → Weather → Gemini AI Plan → Wait & Execute → Email Summary
```

**Actions:**
- Turn OFF overnight ACs at 11:00
- Kitchen AC for pre-lunch (11:30-12:00)
- Living room ACs for Shabbat lunch (12:00-14:00)
- Bedroom/Kids ACs for afternoon rest (14:00-sunset)
- Mini-Bar ON at havdalah — only on Kodesh→Chol transition

---

### 4. 🌙 AI Kids Sleep Climate Guardian
**Trigger:** Hourly, 21:00-07:00

Maintains optimal sleeping temperature for children's room based on real-time outdoor temperature.

**Flow:**
```
Trigger → Get Outdoor Temp (Tomorrow.io) → Decision Logic → Tuya Command
```

**Logic:**
| Season | Condition | Action |
|--------|-----------|--------|
| Summer (May-Oct) | Outdoor ≥ 17°C | AC ON (cool) |
| Summer (May-Oct) | Outdoor < 17°C | AC OFF |
| Winter (Nov-Apr) | Outdoor < 10°C | AC ON (heat) |
| Winter (Nov-Apr) | Outdoor > 12°C | AC OFF |
| Winter (Nov-Apr) | 10-12°C | Maintain (hysteresis) |

---

## Multi-Day Holiday Handling

The system correctly handles complex scenarios like Rosh Hashana + Shabbat (3 consecutive days):

| Day | Time | Agent | Transition | Actions |
|-----|------|-------|------------|---------|
| Wed | 15:00 | Erev | Chol→Kodesh ✅ | Shutdown boiler+minibar, plan evening |
| Thu | 00:00 | Day | No transition | Daytime comfort only |
| Thu | 15:00 | Erev | Kodesh→Kodesh | Evening comfort only (no shutdowns) |
| Fri | 00:00 | Day | No transition | Daytime comfort only |
| Fri | 15:00 | Erev | Kodesh→Kodesh | Evening comfort only (no shutdowns) |
| Sat | 00:00 | Day | Kodesh→Chol ✅ | Daytime + Mini-bar ON at havdalah |

---

## Smart Devices (Tuya)

| Device | ID | Type |
|--------|-----|------|
| Shutter Left | `DEVICE_SHUTTER_LEFT` | Curtain |
| Shutter Right | `DEVICE_SHUTTER_RIGHT` | Curtain |
| AC Living Room 1 | `DEVICE_AC_LIVING_1` | Climate |
| AC Bedroom | `DEVICE_AC_BEDROOM` | Climate |
| AC Kids | `DEVICE_AC_KIDS` | Climate |
| AC Kitchen | `DEVICE_AC_KITCHEN` | Climate |
| Boiler | `DEVICE_BOILER` | Switch |
| Mini-Bar | `DEVICE_MINI_BAR` | Switch |

---

## Project Structure

```
automation/
├── docker-compose.yml          # n8n + gmail-relay containers
├── .env                        # n8n encryption key
├── data/
│   └── config.json             # All secrets, device IDs, and settings
├── blinds-scripts/             # Weather blinds workflow scripts
│   ├── build-ai-prompt.js
│   ├── calculate-wait-until-chatzot.js
│   ├── close-tuya-blinds.js
│   ├── fetch-weather-data-ims.js
│   ├── find-nearest-stations.js
│   ├── get-tuya-token.js
│   ├── parse-ai-response.js
│   └── prepare-email.js
├── shabbat-scripts/            # Shabbat/Holiday workflow scripts
│   ├── ai-shabbat-steward.js          # Erev AI prompt + Gemini call
│   ├── ai-yom-kodesh-steward.js       # Day AI prompt + Gemini call
│   ├── check-shabbat-entry.js         # Hebcal: is tonight erev?
│   ├── check-yom-kodesh.js            # Hebcal: is today kodesh?
│   ├── get-weather-forecast.js        # Tomorrow.io forecast
│   ├── load-config.js                 # Read config.json
│   ├── split-schedule.js              # Split AI schedule to items
│   ├── calc-wait-seconds.js           # Calculate wait per action
│   ├── execute-single-action.js       # Execute one Tuya command
│   ├── send-erev-summary-email.js     # Beautiful erev email
│   └── send-kodesh-summary-email.js   # Beautiful day email
├── kids-ac-scripts/            # Kids AC workflow scripts
│   └── check-and-control.js
├── gmail-relay/                # SMTP relay (Gmail OAuth)
│   ├── Dockerfile
│   ├── google-smtp-relay.py
│   └── config/
│       ├── credentials.json
│       └── token.json
├── workflow-blinds-ai.json     # Exportable workflow JSONs
├── workflow-shabbat-steward.json
├── workflow-shabbat-day.json
├── workflow-kids-ac.json
└── build-workflow.py           # Script to rebuild JSONs from scripts/
```

---

## Configuration

All configuration is centralized in `data/config.json`:

```json
{
  "secrets": { "TUYA_ACCESS_ID", "TUYA_ACCESS_SECRET", "GEMINI_API_KEY", ... },
  "devices": { "AC_KIDS", "BOILER", "MINI_BAR", ... },
  "settings": { "LATITUDE", "LONGITUDE", "SUMMER_MONTHS", "AC_TEMP_THRESHOLD", ... }
}
```

To change a setting (e.g., temperature threshold), edit `data/config.json` — no workflow changes needed.

---

## External APIs

| API | Purpose | Auth |
|-----|---------|------|
| [Gemini 2.5 Flash](https://ai.google.dev/) | AI decision engine | API Key |
| [IMS Israel](https://ims.gov.il/) | Real-time solar radiation | API Token |
| [Tomorrow.io](https://tomorrow.io/) | Weather forecast | API Key |
| [Hebcal](https://hebcal.com/) | Jewish calendar, zmanim, holidays | None |
| [Tuya Cloud](https://developer.tuya.com/) | Smart device control | HMAC-SHA256 |

---

## Deployment

```bash
cd ~/automation
docker compose up -d
```

Access n8n at: `https://your-n8n-domain.example.com`

---

## Email Notifications

Each agent sends a styled HTML email report:
- 🌤️ Blinds: sunny/cloudy decision with AI reasoning
- 🕯️ Erev: candle lighting time + scheduled actions table
- ✡️ Day: havdalah time + daytime plan
