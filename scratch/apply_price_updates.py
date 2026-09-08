"""
Price Update Script for Vinsho Candle Products
Based on WhatsApp price screenshots (5 screenshots, Monday + Tuesday session).

Prices extracted from chat thumbnails matched visually to product images.
Selling prices are set exactly as given. MRP = ceil(price * 1.25) rounded to nearest 10.
"""

import json
import math

def round_up_mrp(selling_price):
    """Round selling price up by 25% to nearest 10."""
    return math.ceil(selling_price * 1.25 / 10) * 10

# CONFIRMED PRICE UPDATES (selling price in INR)
# slug -> selling_price
PRICE_UPDATES = {
    # Monday session (5:16pm - 5:22pm)
    "seashell-gel-wax-candle": 440,             # 32: Seashell gel wax (purple/gem) - CONFIRMED (already set)
    "ocean-bowl-candle": 2200,                  # 07: Ocean blue deep bowl - CONFIRMED (already set)
    "blue-and-white-floral-bowl-candle": 2280,  # 03: Blue & white floral bowl (dotted stars)
    "orange-pumpkin-bowl-candle": 2200,         # 08: Orange pumpkin bowl - CONFIRMED (already set)
    "pumpkin-boat-candle": 1440,                # 09: Yellow pumpkin boat candle
    "peony-boat-candle": 1480,                  # 11: Pink peony/floral held in hand
    "blue-love-jar-candle": 740,               # 13: Blue love jar - CONFIRMED (already set)
    "floral-boat-candle-collection": 880,       # 33: Multi-flower oval boats (Monday 5:18pm)
    "succulent-jar-candle": 740,               # 35: 4 green succulent jars - CONFIRMED (already set)
    "black-abstract-sculptural-candle": 620,    # 43: Black/dark abstract sculptural
    "cute-teddy-jar-candle": 740,              # 31: Cute teddy jars (2 brown teddies)
    "orange-caramel-layered-jar-candle": 1280,  # 34: Orange/caramel layered latte jar
    "succulent-jar-candle-small": 740,          # 29: Colorful succulent array - keeping existing price
    "bubble-jar-candle": 740,                   # 12: Bubble jar candle
    "caffe-latte-jar-candle": 960,             # 14: Caffe latte / pouring (5:21pm)
    "white-chocolate-strawberry-jar-candle": 1400,  # 26: Strawberry cream jar (5:22pm)

    # Tuesday session (7:02pm - 7:20pm)
    "matcha-latte-jar-candle": 796,            # 21: Matcha latte (green) - 7:02pm
    "rose-garden-jar-candle": 796,             # 20: Rose garden jar - 7:03pm
    "red-mini-heart-jar-candle": 1360,          # 30: Red mini hearts - 7:09pm
    "sunflower-jar-candle": 660,               # 27: Sunflower jar - 7:11 and 7:12pm
    "pink-floral-bouquet-candle": 1120,         # 04: Pink floral bouquet in box - 7:13pm
    "floral-jar-candle-sachet-combo": 1440,     # 28: Floral + sachet combo - 7:15pm
    "tulip-sapphire-candle-bouquet": 1196,      # 24: Tulip sapphire bouquet - 7:18pm
    "3-rose-candle-bouquet": 480,               # 22: 3-rose candle bouquet - 7:19pm
    "royal-red-peony-candle": 1000,             # 25: Royal red peony - 7:19pm
    "orange-floral-bouquet-candle": 1196,       # 05: Orange floral bouquet - 7:19pm
    "hearty-gel-wax-jar-candle": 480,           # 10: Hearty gel wax - 7:20pm
}

# Load the commerce seed data
print("Loading vinsho-commerce-seed.json...")
with open('vinsho-commerce-seed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

updated_count = 0
unchanged_count = 0

print("\n=== PRICE UPDATES ===")
for product in data['products']:
    slug = product.get('slug')
    if slug in PRICE_UPDATES:
        new_selling = PRICE_UPDATES[slug]
        new_mrp = round_up_mrp(new_selling)
        
        old_selling = product.get('sellingPrice')
        old_mrp = product.get('mrp')
        
        # Update prices
        product['sellingPrice'] = new_selling
        product['mrp'] = new_mrp
        
        # Update price field too if it exists
        if 'price' in product:
            product['price'] = new_selling
        
        status = "SAME" if (old_selling == new_selling and old_mrp == new_mrp) else "UPDATED"
        print(f"[{status}] {slug}")
        print(f"         mrp: {old_mrp} -> {new_mrp} | selling: {old_selling} -> {new_selling}")
        
        if status == "UPDATED":
            updated_count += 1
        else:
            unchanged_count += 1

print(f"\n=== SUMMARY ===")
print(f"Updated:   {updated_count} products")
print(f"Unchanged: {unchanged_count} products (already had correct prices)")
print(f"Total processed: {updated_count + unchanged_count}")

# Write back
print("\nWriting updated vinsho-commerce-seed.json...")
with open('vinsho-commerce-seed.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("SUCCESS: vinsho-commerce-seed.json updated.")
