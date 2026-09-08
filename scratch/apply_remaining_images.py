import json
import os

SEED_PATH = 'vinsho-commerce-seed.json'
CONTENT_PATH = 'vinsho-content.json'
CANDLES_PATH = 'src/data/products/candles.json'

REMAINING_MAPPINGS = {
    # Cork Executive / Laptop Sets
    "combo-10-cork-executive-essentials": "/images/vinsho/products/04-executive-laptop-set-multiple-variants.jpg",
    "combo-12-cork-traveller-set": "/images/vinsho/products/04-executive-laptop-set-multiple-variants.jpg",
    "combo-44-cork-premium-desk-collection": "/images/vinsho/products/04-executive-laptop-set-multiple-variants.jpg",
    "combo-45-cork-lenia-laptop-set": "/images/vinsho/products/04-executive-laptop-set-multiple-variants.jpg",
    
    # Cork Planters
    "box-print-planter-cork-table-top-planter": "/images/vinsho/products/18-cork-table-top-planters-collection.jpg",
    "bohemian-print-planter-cork-table-top-planter": "/images/vinsho/products/18-cork-table-top-planters-collection.jpg",
    "diamond-planter-cork-table-top-planter": "/images/vinsho/products/18-cork-table-top-planters-collection.jpg",
    "feather-planter-cork-table-top-planter": "/images/vinsho/products/18-cork-table-top-planters-collection.jpg",
    "olive-planter-cork-table-top-planter": "/images/vinsho/products/18-cork-table-top-planters-collection.jpg",
    "chocochip-planter-cork-table-top-planter": "/images/vinsho/products/18-cork-table-top-planters-collection.jpg",

    # Coasters & Trivets
    "cork-box-print-coaster": "/images/vinsho/products/01-cork-diamond-uv-print-coaster.jpg",
    "cork-coaster-with-stand": "/images/vinsho/products/02-cork-leaf-shape-coaster.jpg",
    "cork-olive-square-trivet": "/images/vinsho/products/03-cork-belly-coaster.jpg",

    # Candles
    "green-succulent-jar-candle": "/images/vinsho/products/25-terrarium-decor-unconfirmed.jpg",
    "diamond-jar-candle-gift": "/images/vinsho/products/26-floral-candle-gift-boxes-unconfirmed.jpg",
    "bubble-jar-candle": "/images/vinsho/products/32-decorative-jar-candle-with-lid-unconfirmed.jpg",
    "ocean-jar-candle": "/images/vinsho/products/33-decorative-jar-candle-with-lid-unconfirmed.jpg",
    "succulent-jar-candle": "/images/vinsho/products/44-succulent-jar-candle-collection.jpg",
    "cute-teddy-jar-candle": "/images/vinsho/products/53-cat-candle-unconfirmed.jpg",
    "mini-teddy-jar-candle": "/images/vinsho/products/53-cat-candle-unconfirmed.jpg",
    "pink-jar-candle": "/images/vinsho/products/61-wave-pillar-candle-unconfirmed.jpg",
    "rose-garden-jar-candle": "/images/vinsho/products/61-wave-pillar-candle-unconfirmed.jpg",
    "royal-red-peony-candle": "/images/vinsho/products/27-floral-boat-candle-collection-unconfirmed.jpg",
    "tulip-sapphire-candle-bouquet": "/images/vinsho/products/27-floral-boat-candle-collection-unconfirmed.jpg",
    "pastel-blue-bowl-candle": "/images/vinsho/products/19-boat-candle-unconfirmed.jpg",
    "seashell-gel-wax-candle": "/images/vinsho/products/22-ocean-bowl-candle.jpg"
}

def update_seed():
    with open(SEED_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for p in data.get('products', []):
        slug = p.get('slug')
        if slug in REMAINING_MAPPINGS:
            p['image'] = REMAINING_MAPPINGS[slug]
            updated += 1

    with open(SEED_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated} remaining product images in {SEED_PATH}")

def update_content():
    with open(CONTENT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for p in data.get('products', []):
        slug = p.get('slug')
        if slug in REMAINING_MAPPINGS:
            p['image'] = REMAINING_MAPPINGS[slug]
            updated += 1

    with open(CONTENT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated} remaining product images in {CONTENT_PATH}")

def update_candles():
    if not os.path.exists(CANDLES_PATH):
        return

    with open(CANDLES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for p in data:
        slug = p.get('slug')
        if slug in REMAINING_MAPPINGS:
            p['image'] = REMAINING_MAPPINGS[slug]
            updated += 1

    with open(CANDLES_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated} remaining candle product images in {CANDLES_PATH}")

if __name__ == '__main__':
    update_seed()
    update_content()
    update_candles()
