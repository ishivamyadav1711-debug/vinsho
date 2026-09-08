import json
import os
import re

with open('vinsho-commerce-seed.json', 'r', encoding='utf-8') as f:
    seed_data = json.load(f)

products = seed_data['products']

def norm(s):
    s = s.lower()
    s = re.sub(r'[\s\-_—&()\.]+', '', s)
    s = s.replace('and', '')
    return s

files = os.listdir('public/images/vinsho/products')
image_files = [f for f in sorted(files) if (f.endswith('.jpg') or f.endswith('.png')) and re.match(r'^\d+-', f)]

mapping = []
unconfirmed = []
collection_group_shots = []
unmatched = []

seen_slugs = {}

for img in image_files:
    if 'unconfirmed' in img:
        unconfirmed.append(img)
        continue
    
    # Check for collection shots
    if 'multiple-variants' in img or 'collection' in img:
        collection_group_shots.append(img)
        continue
        
    raw_name = re.sub(r'^\d+-', '', img)
    raw_name = re.sub(r'\.(jpg|png)$', '', raw_name)
    
    norm_img = norm(raw_name)
    
    matched_product = None
    for p in products:
        norm_slug = norm(p['slug'])
        norm_pname = norm(p['name'])
        
        if norm_img == norm_slug or norm_img == norm_pname:
            matched_product = p
            break
            
    if not matched_product:
        # Try soft match
        for p in products:
            norm_slug = norm(p['slug'])
            norm_pname = norm(p['name'])
            if norm_img.startswith(norm_slug) or norm_slug.startswith(norm_img):
                matched_product = p
                break

    if matched_product:
        slug = matched_product['slug']
        if slug in seen_slugs:
            seen_slugs[slug].append(img)
        else:
            seen_slugs[slug] = [img]
        mapping.append((img, matched_product['name'], matched_product['slug'], matched_product['image']))
    else:
        unmatched.append((img, raw_name))

print(f"Total numeric images: {len(image_files)}")
print(f"Confidently mapped images: {len(mapping)}")
print(f"Unconfirmed images: {len(unconfirmed)}")
print(f"Collection/Group shots: {len(collection_group_shots)}")
print(f"Unmatched images: {len(unmatched)}")

print("\n=== CONFIDENT MAPPINGS ===")
for img, pname, pslug, old_img in mapping:
    print(f"{img:<45} -> {pname} (slug: {pslug})")

print("\n=== UNCONFIRMED IMAGES (NOT AUTO-MAPPED) ===")
for u in unconfirmed:
    print(u)

print("\n=== COLLECTION / GROUP SHOTS (NOT AUTO-MAPPED TO SINGLE PRODUCT) ===")
for g in collection_group_shots:
    print(g)

print("\n=== UNMATCHED ===")
for u in unmatched:
    print(u)

print("\n=== MULTIPLE IMAGES FOR SAME PRODUCT ===")
for slug, img_list in seen_slugs.items():
    if len(img_list) > 1:
        print(f"Product '{slug}': {img_list}")
