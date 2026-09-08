import json

with open('vinsho-commerce-seed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cork_products = []
for p in data['products']:
    cat = (p.get('collection') or p.get('mainCategory') or '').lower()
    subcat = (p.get('subcategory') or p.get('subCategory') or '').lower()
    name = (p.get('name') or '').lower()
    slug = (p.get('slug') or '').lower()
    mat = (p.get('material') or '').lower()
    
    if 'cork' in cat or 'cork' in subcat or 'cork' in name or 'cork' in slug or 'cork' in mat:
        cork_products.append(p)

print(f"Total Cork Products Found: {len(cork_products)}")
print("=" * 65)
for idx, p in enumerate(cork_products, 1):
    price = p.get('sellingPrice') or p.get('price') or 'Price on request'
    print(f"{idx:02d}. {p['name']} (slug: {p['slug']}) - Rs. {price}")
