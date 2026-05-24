#!/usr/bin/env python3
"""
Build workflow JSONs from script files and import them into n8n.

Usage:
  python3 build-workflow.py          # Build all workflows
  python3 build-workflow.py blinds   # Build only blinds workflow
  python3 build-workflow.py kids     # Build only kids-ac workflow
  python3 build-workflow.py --import # Build all and import to n8n

Reads scripts from their respective directories and embeds them into
workflow JSON files. Optionally imports them into n8n via CLI.
"""
import json
import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# === Workflow definitions ===

WORKFLOWS = {
    'blinds': {
        'json_file': os.path.join(BASE_DIR, 'workflow-blinds-ai.json'),
        'scripts_dir': os.path.join(BASE_DIR, 'blinds-scripts'),
        'node_map': {
            'Calculate Wait Until Chatzot': 'calculate-wait-until-chatzot.js',
            'Find Nearest Stations': 'find-nearest-stations.js',
            'Fetch Weather Data (IMS)': 'fetch-weather-data-ims.js',
            'Get Tuya Token': 'get-tuya-token.js',
            'Close Tuya Blinds': 'close-tuya-blinds.js',
            'Prepare Email': 'prepare-email.js',
            'Default: Keep Open (Safe)': 'default-keep-open-safe.js',
            'Default: AI Failed (Safe)': 'default-ai-failed.js',
            'Build AI Prompt': 'build-ai-prompt.js',
            'Parse AI Response': 'parse-ai-response.js',
        }
    },
    'kids': {
        'json_file': os.path.join(BASE_DIR, 'workflow-kids-ac.json'),
        'scripts_dir': os.path.join(BASE_DIR, 'kids-ac-scripts'),
        'node_map': {
            'Get Current Weather': 'get-current-weather.js',
            'AI Kids Climate Guardian': 'ai-kids-climate.js',
            'Execute AC Command': 'execute-ac-command.js',
            'Prepare Morning Email': 'prepare-morning-email.js',
        }
    },
    'shabbat': {
        'json_file': os.path.join(BASE_DIR, 'workflow-shabbat-steward.json'),
        'scripts_dir': os.path.join(BASE_DIR, 'shabbat-scripts'),
        'node_map': {
            'Load Config': 'load-config.js',
            'Check Shabbat Entry': 'check-shabbat-entry.js',
            'Get Weather Forecast': 'get-weather-forecast.js',
            'AI Shabbat Steward': 'ai-shabbat-steward.js',
            'Split Schedule': 'split-schedule.js',
            'Calc Wait Time': 'calc-wait-seconds.js',
            'Execute Tuya Command': 'execute-single-action.js',
            'Prepare Erev Email': 'send-erev-summary-email.js',
        }
    },
    'shabbat-day': {
        'json_file': os.path.join(BASE_DIR, 'workflow-shabbat-day.json'),
        'scripts_dir': os.path.join(BASE_DIR, 'shabbat-scripts'),
        'node_map': {
            'Load Config': 'load-config.js',
            'Check Yom Kodesh': 'check-yom-kodesh.js',
            'Get Weather Forecast': 'get-weather-forecast.js',
            'AI Yom Kodesh Steward': 'ai-yom-kodesh-steward.js',
            'Execute Shabbat Actions': 'execute-schedule.js',
            'Prepare Kodesh Email': 'send-kodesh-summary-email.js',
        }
    },
}


def build_workflow(name, config):
    """Embed script files into workflow JSON."""
    json_file = config['json_file']
    scripts_dir = config['scripts_dir']
    node_map = config['node_map']

    if not os.path.exists(json_file):
        print(f'  ✗ Workflow file not found: {json_file}')
        return False

    with open(json_file) as f:
        workflow = json.load(f)

    updated = 0
    for node in workflow['nodes']:
        if node['name'] in node_map:
            script_file = os.path.join(scripts_dir, node_map[node['name']])
            if os.path.exists(script_file):
                with open(script_file) as f:
                    code = f.read()
                node['parameters']['jsCode'] = code
                updated += 1
                print(f'  ✓ {node["name"]} <- {node_map[node["name"]]}')
            else:
                print(f'  ✗ Script not found: {script_file}')

    with open(json_file, 'w') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)

    print(f'  Updated {updated} nodes in {os.path.basename(json_file)}')
    return True


def import_to_n8n(json_file):
    """Import workflow JSON into n8n via docker exec."""
    container_path = '/home/node/.n8n/' + os.path.basename(json_file)

    # Copy file into container
    subprocess.run(
        ['docker', 'cp', json_file, f'n8n-automation:{container_path}'],
        check=True
    )

    # Import into n8n
    result = subprocess.run(
        ['docker', 'exec', 'n8n-automation', 'n8n', 'import:workflow', f'--input={container_path}'],
        capture_output=True, text=True
    )

    if result.returncode == 0:
        print(f'  ✓ Imported {os.path.basename(json_file)} to n8n')
    else:
        print(f'  ✗ Import failed: {result.stderr}')

    # Cleanup
    subprocess.run(
        ['docker', 'exec', 'n8n-automation', 'rm', container_path],
        capture_output=True
    )

    return result.returncode == 0


def main():
    do_import = '--import' in sys.argv
    targets = [a for a in sys.argv[1:] if not a.startswith('-')]

    if not targets:
        targets = list(WORKFLOWS.keys())

    print('=== Building workflows ===\n')

    built_files = []
    for name in targets:
        if name not in WORKFLOWS:
            print(f'Unknown workflow: {name}. Available: {", ".join(WORKFLOWS.keys())}')
            continue
        print(f'[{name}]')
        if build_workflow(name, WORKFLOWS[name]):
            built_files.append(WORKFLOWS[name]['json_file'])
        print()

    if do_import and built_files:
        print('=== Importing to n8n ===\n')
        for f in built_files:
            import_to_n8n(f)

        # Publish workflows (import only updates draft, not published version)
        print('\n⚠️  Publishing workflows...')
        for f in built_files:
            wf = json.load(open(f))
            wf_id = wf.get('id')
            if wf_id:
                result = subprocess.run(
                    ['docker', 'exec', 'n8n-automation', 'n8n', 'publish:workflow', f'--id={wf_id}'],
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    print(f'  ✓ Published {wf.get("name", wf_id)}')
                else:
                    print(f'  ✗ Publish failed for {wf.get("name", wf_id)}: {result.stderr.strip()}')

        subprocess.run(['docker', 'restart', 'n8n-automation'], check=True)
        print('  ✓ n8n restarted')


if __name__ == '__main__':
    main()
