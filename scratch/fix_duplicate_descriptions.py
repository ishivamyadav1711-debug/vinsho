import json
import os

SEED_PATH = 'vinsho-commerce-seed.json'
CONTENT_PATH = 'vinsho-content.json'
CANDLES_PATH = 'src/data/products/candles.json'
VPRODUCTS_PATH = 'vinsho_products.json'

NEW_DESCRIPTIONS = {
    "black-beauty-candle": "Crafted with dramatic dark wax tones and a sleek silhouette, the Black Beauty Candle brings a sophisticated aesthetic and a mysterious ambient glow to modern interiors, executive desks, and moody lounge spaces.",
    "decorative-candles": "Enrich your home's atmosphere with our collection of artisanal decorative candles, thoughtfully poured into elegant vessels that double as sculpted centerpiece accents even when unlit.",
    "fridge-cover": "A practical kitchen textile accessory designed to protect your refrigerator surface from dust, scratches, and finger marks while introducing a fresh pattern and organized side pockets to your cooking area.",
    "fridge-covers": "Designed for everyday utility and kitchen coordination, these durable fabric fridge covers shield appliance surfaces from everyday wear while adding storage convenience for kitchen tools and notes.",
    "jaguar-new-arrival-teaser": "An exclusive sneak peek into our luxury accent collection, this jaguar showpiece teaser features a sleek panther silhouette with hand-detailed gold accents, crafted for contemporary display consoles.",
    "jaguar": "A striking symbol of power and grace, this sculpted jaguar showpiece features a smooth black finish with refined detailing, making it an extraordinary focal point for sideboards, shelves, and executive spaces.",
    "mattress": "Engineered for optimal spine alignment and pressure-relieving comfort, this premium mattress offers plush breathable layers to ensure deeply restorative sleep night after night.",
    "mattresses": "Designed with supportive core technology and soft contouring fabrics, our mattresses provide a tranquil sleeping foundation tailored to enhance morning vitality and bedroom comfort.",
    "show-piece-vintage-wall-d-cor": "Infuse classic charm into your vertical spaces with this vintage-inspired wall showpiece, featuring ornate filigree detailing and an antiqued finish perfect for hallways, foyers, and traditional studies.",
    "show-piece-vintage-wall-decor": "Infuse classic charm into your vertical spaces with this vintage-inspired wall showpiece, featuring ornate filigree detailing and an antiqued finish perfect for hallways, foyers, and traditional studies.",
    "show-piece": "An artistic standalone table accent crafted to add texture, dimension, and refined aesthetic character to consoles, side tables, mantelpieces, and display cabinets.",
    "wall-art-2": "A multi-dimensional metal wall sculpture designed with cascading geometric elements and warm metallic tones to turn empty living room or office walls into captivating visual focal points.",
    "wall-art": "Expressive contemporary wall artwork crafted to bring color harmony, depth, and creative elegance to living spaces, bedroom headboard backdrops, and dining areas.",
    "succulent-jar-candle": "Hand-poured into a textured ceramic vessel, this succulent-themed jar candle features detailed wax botanical toppers and a clean-burning cotton wick that fills your home with soothing natural scents.",
    "green-succulent-jar-candle": "Inspired by miniature desert gardens, this Green Succulent Jar Candle blends realistic botanical wax art with calming floral scents, creating a delightful decorative accent for desks and vanity tables."
}

def update_file(filepath):
    if not os.path.exists(filepath):
        return 0

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    items = data.get('products') if isinstance(data, dict) else data

    for p in items:
        slug = p.get('slug')
        if slug in NEW_DESCRIPTIONS:
            p['description'] = NEW_DESCRIPTIONS[slug]
            updated += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated} product descriptions in {filepath}")
    return updated

if __name__ == '__main__':
    update_file(SEED_PATH)
    update_file(CONTENT_PATH)
    update_file(CANDLES_PATH)
    update_file(VPRODUCTS_PATH)
