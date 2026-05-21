#!/usr/bin/env python3
"""
Build workflow JSON from script files.
Usage: python3 build-workflow.py

Reads scripts from ./scripts/ and embeds them into workflow-blinds-ai.json.
This keeps the scripts readable in separate files while generating
the single-line format that n8n requires.
"""
import json, os

WORKFLOW_FILE = os.path.join(os.path.dirname(__file__), 'workflow-blinds-ai.json')
SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), 'scripts')

# Mapping: node name -> script filename
NODE_SCRIPT_MAP = {
    'Calculate Wait Until Chatzot': 'calculate-wait-until-chatzot.js',
    'Find Nearest Stations': 'find-nearest-stations.js',
    'Fetch Weather Data (IMS)': 'fetch-weather-data-ims.js',
    'Get Tuya Token': 'get-tuya-token.js',
    'Close Tuya Blinds': 'close-tuya-blinds.js',
    'Prepare Email': 'prepare-email.js',
    'Default: Keep Open (Safe)': 'default-keep-open-safe.js',
    'Build AI Prompt': 'build-ai-prompt.js',
    'Parse AI Response': 'parse-ai-response.js',
}

def main():
    with open(WORKFLOW_FILE) as f:
        workflow = json.load(f)

    updated = 0
    for node in workflow['nodes']:
        if node['name'] in NODE_SCRIPT_MAP:
            script_file = os.path.join(SCRIPTS_DIR, NODE_SCRIPT_MAP[node['name']])
            if os.path.exists(script_file):
                with open(script_file) as f:
                    code = f.read()
                node['parameters']['jsCode'] = code
                updated += 1
                print(f'  ✓ {node["name"]} <- {NODE_SCRIPT_MAP[node["name"]]}')

    with open(WORKFLOW_FILE, 'w') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)

    print(f'\nUpdated {updated} nodes in {WORKFLOW_FILE}')

if __name__ == '__main__':
    main()
