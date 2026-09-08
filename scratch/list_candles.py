import json

with open('vinsho-commerce-seed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

candle_keywords = ['candle', 'bouquet', 'peony', 'tulip', 'blushing', '3-rose']

candle_products = []
for p in data['products']:
    slug = p.get('slug', '')
    if any(keyword in slug for keyword in candle_keywords):
        candle_products.append({
            'slug': slug,
            'name': p.get('name'),
            'mrp': p.get('mrp'),
            'sellingPrice': p.get('sellingPrice'),
            'isPurchasable': p.get('isPurchasable'),
        })

print(f'Found {len(candle_products)} candle products:')
for c in candle_products:
    print(f"  {c['slug']}: mrp={c['mrp']}, selling={c['sellingPrice']}, purchasable={c['isPurchasable']}")
