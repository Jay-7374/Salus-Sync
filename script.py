import json
with open(r'C:\Users\Admin\.gemini\antigravity-ide\brain\42dfab71-e9f9-4f72-ac74-ed5d6dc63f1d\.system_generated\logs\transcript_full.jsonl', encoding='utf-8') as f:
    with open('prompts.txt', 'w', encoding='utf-8') as out:
        for line in f:
            d = json.loads(line)
            if d.get('type') == 'USER_INPUT':
                out.write("-------------------\n")
                out.write(d['content'][:500] + "\n")
