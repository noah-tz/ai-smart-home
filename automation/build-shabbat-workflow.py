#!/usr/bin/env python3
"""Build and upload the Shabbat Steward workflow to n8n"""
import json, os, subprocess

SCRIPTS_DIR = '/root/AiAgent/automation/shabbat-scripts'

def load_script(name):
    with open(os.path.join(SCRIPTS_DIR, name)) as f:
        return f.read()

workflow = {
    "name": "AI Shabbat & Holiday Steward",
    "settings": {"executionOrder": "v1", "timezone": "Asia/Jerusalem"},
    "nodes": [
        {
            "parameters": {
                "rule": {"interval": [{"triggerAtHour": 15, "triggerAtMinute": 0}]}
            },
            "id": "cron-shabbat",
            "name": "Daily 15:00 Check",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0]
        },
        {
            "parameters": {"jsCode": load_script("load-config.js")},
            "id": "load-config",
            "name": "Load Config",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [220, 0]
        },
        {
            "parameters": {"jsCode": load_script("check-shabbat-entry.js")},
            "id": "check-entry",
            "name": "Check Shabbat Entry",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [440, 0]
        },
        {
            "parameters": {
                "conditions": {
                    "conditions": [{
                        "id": "is-erev",
                        "leftValue": "={{$json.isErevKodesh}}",
                        "rightValue": True,
                        "operator": {"type": "boolean", "operation": "equals"}
                    }],
                    "combinator": "and"
                }
            },
            "id": "if-erev",
            "name": "Is Erev Kodesh?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [660, 0]
        },
        {
            "parameters": {"jsCode": load_script("get-weather-forecast.js")},
            "id": "get-weather",
            "name": "Get Weather Forecast",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [880, -100]
        },
        {
            "parameters": {"jsCode": load_script("plan-erev-shabbat.js")},
            "id": "plan-erev",
            "name": "Plan Erev Shabbat",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1100, -100]
        },
        {
            "parameters": {"jsCode": load_script("execute-schedule.js")},
            "id": "execute-erev",
            "name": "Execute Erev Actions",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1320, -100]
        },
        {
            "parameters": {
                "jsCode": "// Not Erev Kodesh today - no action needed\nreturn [{ json: { message: 'Not Erev Kodesh today, skipping.' } }];"
            },
            "id": "skip-node",
            "name": "Not Erev - Skip",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [880, 100]
        }
    ],
    "connections": {
        "Daily 15:00 Check": {"main": [[{"node": "Load Config", "type": "main", "index": 0}]]},
        "Load Config": {"main": [[{"node": "Check Shabbat Entry", "type": "main", "index": 0}]]},
        "Check Shabbat Entry": {"main": [[{"node": "Is Erev Kodesh?", "type": "main", "index": 0}]]},
        "Is Erev Kodesh?": {
            "main": [
                [{"node": "Get Weather Forecast", "type": "main", "index": 0}],
                [{"node": "Not Erev - Skip", "type": "main", "index": 0}]
            ]
        },
        "Get Weather Forecast": {"main": [[{"node": "Plan Erev Shabbat", "type": "main", "index": 0}]]},
        "Plan Erev Shabbat": {"main": [[{"node": "Execute Erev Actions", "type": "main", "index": 0}]]}
    }
}

# Save locally
with open('/root/AiAgent/automation/workflow-shabbat-steward.json', 'w') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print("Workflow saved to workflow-shabbat-steward.json")
print(f"Nodes: {len(workflow['nodes'])}")

# Upload to n8n
print("\nUploading to n8n...")
# Login
login = subprocess.run(
    ['curl', '-s', 'http://localhost:5678/rest/login', '-X', 'POST',
     '-H', 'Content-Type: application/json',
     '-d', '{"emailOrLdapLoginId":"your@email.com","password":"TempPass123!"}',
     '-c', '/tmp/n8n-cookies'],
    capture_output=True, text=True
)
login_resp = json.loads(login.stdout)
if 'data' not in login_resp:
    print("Login failed!")
    exit(1)

# Create workflow
result = subprocess.run(
    ['curl', '-s', 'http://localhost:5678/rest/workflows', '-X', 'POST',
     '-H', 'Content-Type: application/json',
     '-b', '/tmp/n8n-cookies',
     '-d', json.dumps(workflow)],
    capture_output=True, text=True
)
resp = json.loads(result.stdout)
if 'data' in resp:
    wf_id = resp['data']['id']
    print(f"✅ Workflow created! ID: {wf_id}")
    
    # Activate
    vid = resp['data']['versionId']
    act = subprocess.run(
        ['curl', '-s', f'http://localhost:5678/rest/workflows/{wf_id}/activate',
         '-X', 'POST', '-H', 'Content-Type: application/json',
         '-b', '/tmp/n8n-cookies',
         '-d', json.dumps({"versionId": vid})],
        capture_output=True, text=True
    )
    act_resp = json.loads(act.stdout)
    print(f"Active: {act_resp.get('data',{}).get('active')}")
else:
    print(f"Error: {json.dumps(resp)[:300]}")
