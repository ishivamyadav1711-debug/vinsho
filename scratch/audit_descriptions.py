import json
from collections import defaultdict

with open('vinsho-commerce-seed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

products = data['products']
print(f"Total products in catalog: {len(products)}")

desc_map = defaultdict(list)
empty_desc = []
short_desc = []

for p in products:
    desc = (p.get('description') or '').strip()
    slug = p.get('slug')
    name = p.get('name')
    
    if not desc or desc.lower() == 'none' or desc.lower() == 'null':
        empty_desc.append((name, slug))
    elif len(desc) < 30:
        short_desc.append((name, slug, desc))
    else:
        desc_map[desc].append((name, slug))

duplicates = {desc: items for desc, items in desc_map.items() if len(items) > 1}
unique_count = sum(1 for desc, items in desc_map.items() if len(items) == 1)

print(f"\n--- AUDIT RESULTS ---")
print(f"Products with unique descriptions: {unique_count}")
print(f"Products with empty/missing descriptions: {len(empty_desc)}")
print(f"Products with short descriptions (<30 chars): {len(short_desc)}")
print(f"Duplicate description groups: {len(duplicates)}")

if empty_desc:
    print("\n=== EMPTY DESCRIPTIONS ===")
    for name, slug in empty_desc:
        print(f" - {name} ({slug})")

if duplicates:
    print("\n=== DUPLICATE DESCRIPTION GROUPS ===")
    for desc, items in duplicates.items():
        print(f"\nDescription ({len(items)} products): \"{desc[:90]}...\"")
        for name, slug in items:
            print(f"   * {name} ({slug})")
