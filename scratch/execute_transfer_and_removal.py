import json
import os

slugs_to_remove = set([
    'pink-heart-scallop-jar-candle',
    'black-abstract-sculptural-candle',
    'caff-latte-jar-candle',
    'floral-relief-pillar-candle',
    'rose-sculpture-pillar-candle',
    'snowman-christmas-candle',
    'swan-sculptural-candle',
    'teddy-bear-sculptural-candle'
])

pink_jar_data = {
    "image": "/products/candles/39-pink-heart-scallop-jar-candle.jpg",
    "highlights": [
        {"title": "Heart-Centred Design", "description": "The heart motif gives the candle a distinctly affectionate and romantic personality."},
        {"title": "Scalloped Edge Detailing", "description": "The softly scalloped form adds decorative rhythm around the jar silhouette."},
        {"title": "Soft Pink Character", "description": "Its gentle colour palette reinforces the warm, sentimental design language."},
        {"title": "Occasion-Focused Gifting", "description": "Especially suited to romantic gestures, anniversaries and heartfelt gifting."}
    ],
    "quote": "A heart-shaped way to say it."
}

# 1. Update vinsho-commerce-seed.json
seed_path = 'vinsho-commerce-seed.json'
if os.path.exists(seed_path):
    with open(seed_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Update pink-jar-candle
    for p in data.get('products', []):
        if p.get('slug') == 'pink-jar-candle':
            p['image'] = pink_jar_data['image']
            p['highlights'] = pink_jar_data['highlights']
            p['features'] = pink_jar_data['highlights']
            p['closingLine'] = pink_jar_data['quote']
            p['closing_line'] = pink_jar_data['quote']
            p['highlightsTagline'] = pink_jar_data['quote']
            print("Updated pink-jar-candle in vinsho-commerce-seed.json")

    # Filter out removed products
    orig_len = len(data.get('products', []))
    data['products'] = [p for p in data.get('products', []) if p.get('slug') not in slugs_to_remove]
    new_len = len(data['products'])
    print(f"vinsho-commerce-seed.json: Products count {orig_len} -> {new_len} (Removed {orig_len - new_len})")

    with open(seed_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# 2. Update vinsho-taxonomy.json
tax_path = 'vinsho-taxonomy.json'
if os.path.exists(tax_path):
    with open(tax_path, 'r', encoding='utf-8') as f:
        tax_data = json.load(f)

    if isinstance(tax_data, dict):
        if 'products' in tax_data:
            for p in tax_data['products']:
                if p.get('slug') == 'pink-jar-candle':
                    p['image'] = pink_jar_data['image']
                    p['highlights'] = pink_jar_data['highlights']
                    p['features'] = pink_jar_data['highlights']
                    p['closingLine'] = pink_jar_data['quote']
                    p['closing_line'] = pink_jar_data['quote']
                    p['highlightsTagline'] = pink_jar_data['quote']
            orig_len = len(tax_data['products'])
            tax_data['products'] = [p for p in tax_data['products'] if p.get('slug') not in slugs_to_remove]
            print(f"vinsho-taxonomy.json (products): {orig_len} -> {len(tax_data['products'])}")

        # Also clean up subcategories.products arrays if strings or objects
        for col in tax_data.get('collections', []):
            for sub in col.get('subcategories', []):
                if 'products' in sub and isinstance(sub['products'], list):
                    sub['products'] = [p for p in sub['products'] if (p if isinstance(p, str) else p.get('slug')) not in slugs_to_remove]

    with open(tax_path, 'w', encoding='utf-8') as f:
        json.dump(tax_data, f, indent=2, ensure_ascii=False)

# 3. Update vinsho-content.json
content_path = 'vinsho-content.json'
if os.path.exists(content_path):
    with open(content_path, 'r', encoding='utf-8') as f:
        content_data = json.load(f)
    if isinstance(content_data, list):
        for p in content_data:
            if p.get('slug') == 'pink-jar-candle':
                p['image'] = pink_jar_data['image']
        content_data = [p for p in content_data if p.get('slug') not in slugs_to_remove]
        with open(content_path, 'w', encoding='utf-8') as f:
            json.dump(content_data, f, indent=2, ensure_ascii=False)
        print("Updated vinsho-content.json")

# 4. Update vinsho_products.json
vprod_path = 'vinsho_products.json'
if os.path.exists(vprod_path):
    with open(vprod_path, 'r', encoding='utf-8') as f:
        vprod_data = json.load(f)
    if isinstance(vprod_data, list):
        for p in vprod_data:
            if p.get('slug') == 'pink-jar-candle':
                p['image'] = pink_jar_data['image']
        vprod_data = [p for p in vprod_data if p.get('slug') not in slugs_to_remove]
        with open(vprod_path, 'w', encoding='utf-8') as f:
            json.dump(vprod_data, f, indent=2, ensure_ascii=False)
        print("Updated vinsho_products.json")
