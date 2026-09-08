import json
import os
import re

# File paths
SEED_PATH = 'vinsho-commerce-seed.json'
CONTENT_PATH = 'vinsho-content.json'
CANDLES_PATH = 'src/data/products/candles.json'
VPRODUCTS_PATH = 'vinsho_products.json'

# Confident image mappings (filename -> slug)
IMAGE_MAPPINGS = {
    "cork-diamond-uv-print-coaster": "/images/vinsho/products/01-cork-diamond-uv-print-coaster.jpg",
    "cork-leaf-shape-coaster": "/images/vinsho/products/02-cork-leaf-shape-coaster.jpg",
    "cork-belly-coaster": "/images/vinsho/products/03-cork-belly-coaster.jpg",
    "combo-20-executive-laptop-set-brown": "/images/vinsho/products/05-combo-20-executive-laptop-set-brown.jpg",
    "combo-30-cork-printed-diary-pen-set": "/images/vinsho/products/06-combo-30-cork-printed-diary-and-pen-set.jpg",
    "combo-29-cork-diary-pen-set": "/images/vinsho/products/07-combo-29-cork-diary-and-pen-set.jpg",
    "combo-11-cork-signature-desk-set": "/images/vinsho/products/08-combo-11-cork-signature-desk-set.jpg",
    "combo-36-cork-workstation-set": "/images/vinsho/products/09-combo-36-cork-workstation-set.jpg",
    "combo-19-executive-laptop-set-deep-blue": "/images/vinsho/products/10-combo-19-executive-laptop-set-deep-blue.jpg",
    "combo-18-executive-laptop-set-ocean-mist": "/images/vinsho/products/11-combo-18-executive-laptop-set-ocean-mist.jpg",
    "combo-14-cork-hosting-set": "/images/vinsho/products/12-combo-14-cork-hosting-set.jpg",
    "combo-46-cork-printed-hosting-set": "/images/vinsho/products/13-combo-46-cork-printed-hosting-set.jpg",
    "combo-47-cork-bark-hosting-set": "/images/vinsho/products/14-combo-47-cork-bark-hosting-set.jpg",
    "combo-13-cork-desk-grow-set": "/images/vinsho/products/15-combo-13-cork-desk-and-grow-set.jpg",
    "combo-37-cork-desk-travel-set": "/images/vinsho/products/16-combo-37-cork-desk-and-travel-set.jpg",
    "teddy-girl-candle": "/images/vinsho/products/17-teddy-girl-candle.jpg",
    "sunflower-jar-candle": "/images/vinsho/products/20-sunflower-jar-candle.jpg",
    "snowman-pillar-candle": "/images/vinsho/products/21-snowman-pillar-candle.jpg",
    "ocean-bowl-candle": "/images/vinsho/products/22-ocean-bowl-candle.jpg",
    "peony-boat-candle": "/images/vinsho/products/23-peony-boat-candle.jpg",
    "red-mini-heart-jar-candle": "/images/vinsho/products/24-red-mini-heart-jar-candle.jpg",
    "whipped-floral-jar-candle": "/images/vinsho/products/28-whipped-floral-jar-candle.jpg",
    "succulent-jar-candle-small": "/images/vinsho/products/29-succulent-jar-candle-small.jpg",
    "blushing-rose-candle-bouquet": "/images/vinsho/products/30-blushing-rose-candle-bouquet.jpg",
    "white-chocolate-strawberry-jar-candle": "/images/vinsho/products/31-white-chocolate-and-strawberry-jar-candle.jpg",
    "blue-love-jar-candle": "/images/vinsho/products/34-blue-love-jar-candle.jpg",
    "matcha-latte-jar-candle": "/images/vinsho/products/35-matcha-latte-jar-candle.jpg",
    "mini-floral-candle-bouquet": "/images/vinsho/products/36-mini-floral-candle-bouquet-blue.jpg",
    "3-shade-flower-jar-candle": "/images/vinsho/products/38-3-shade-flower-jar-candle.jpg",
    "3-rose-candle-bouquet": "/images/vinsho/products/40-3-rose-candle-bouquet.jpg",
    "caff-latte-jar-candle": "/images/vinsho/products/41-caff-latte-jar-candle.jpg",
    "caffe-latte-jar-candle": "/images/vinsho/products/41-caff-latte-jar-candle.jpg",
    "hearty-gel-wax-jar-candle": "/images/vinsho/products/42-hearty-gel-wax-jar-candle.jpg",
    "floral-jar-candle-sachet-combo": "/images/vinsho/products/43-floral-jar-candle-and-sachet-combo.jpg",
    "floral-pillar-candle": "/images/vinsho/products/46-floral-pillar-candle.jpg",
    "rose-pillar-candle": "/images/vinsho/products/47-rose-pillar-candle.jpg",
    "orange-pumpkin-bowl-candle": "/images/vinsho/products/48-orange-pumpkin-bowl-candle.jpg",
    "dog-candle": "/images/vinsho/products/50-dog-candle.jpg",
    "black-beauty-candle": "/images/vinsho/products/51-black-beauty-candle.jpg",
    "couple-pillar-candle": "/images/vinsho/products/52-couple-pillar-candle.jpg",
    "concrete-ribbed-jar-candle-with-lid": "/images/vinsho/products/54-concrete-ribbed-jar-candle-with-lid.jpg",
    "pumpkin-boat-candle": "/images/vinsho/products/56-pumpkin-boat-candle.jpg",
    "teddy-boy-candle": "/images/vinsho/products/57-teddy-boy-candle.jpg",
    "concrete-hexa-jar-candle": "/images/vinsho/products/59-concrete-hexa-jar-candle.jpg",
    "concrete-ocean-theme-jar-candle": "/images/vinsho/products/60-concrete-ocean-theme-jar-candle.jpg"
}

# Secondary gallery image mappings
SECONDARY_GALLERY_MAPPINGS = {
    "teddy-girl-candle": ["/images/vinsho/products/58-teddy-girl-candle.jpg"],
    "sunflower-jar-candle": ["/images/vinsho/products/49-sunflower-jar-candle.jpg"],
    "ocean-bowl-candle": ["/images/vinsho/products/37-ocean-bowl-candle.jpg"],
    "red-mini-heart-jar-candle": ["/images/vinsho/products/45-red-mini-heart-jar-candle.jpg"],
    "white-chocolate-strawberry-jar-candle": ["/images/vinsho/products/39-white-chocolate-and-strawberry-jar-candle.jpg"],
    "floral-pillar-candle": ["/images/vinsho/products/55-floral-pillar-candle.jpg"]
}

def update_seed_file():
    with open(SEED_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated_primary = 0
    updated_gallery = 0

    for product in data.get('products', []):
        slug = product.get('slug')
        if slug in IMAGE_MAPPINGS:
            product['image'] = IMAGE_MAPPINGS[slug]
            updated_primary += 1

        if slug in SECONDARY_GALLERY_MAPPINGS:
            images_list = [IMAGE_MAPPINGS.get(slug)] + SECONDARY_GALLERY_MAPPINGS[slug]
            product['images'] = [img for img in images_list if img]
            updated_gallery += 1

    with open(SEED_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated_primary} primary images and {updated_gallery} secondary gallery sets in {SEED_PATH}")

def update_content_file():
    with open(CONTENT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for product in data.get('products', []):
        slug = product.get('slug')
        if slug in IMAGE_MAPPINGS:
            product['image'] = IMAGE_MAPPINGS[slug]
            updated += 1

    with open(CONTENT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated} images in {CONTENT_PATH}")

def update_candles_file():
    if not os.path.exists(CANDLES_PATH):
        return

    with open(CANDLES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for product in data:
        slug = product.get('slug')
        if slug in IMAGE_MAPPINGS:
            product['image'] = IMAGE_MAPPINGS[slug]
            updated += 1

    with open(CANDLES_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated} images in {CANDLES_PATH}")

def update_vproducts_file():
    if not os.path.exists(VPRODUCTS_PATH):
        return

    with open(VPRODUCTS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for product in data:
        slug = product.get('slug')
        if slug in IMAGE_MAPPINGS:
            product['image'] = IMAGE_MAPPINGS[slug]
            updated += 1

    with open(VPRODUCTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated} images in {VPRODUCTS_PATH}")

if __name__ == '__main__':
    update_seed_file()
    update_content_file()
    update_candles_file()
    update_vproducts_file()
