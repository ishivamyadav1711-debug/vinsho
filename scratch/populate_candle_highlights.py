import json
import os

data_map = {
  "teddy-girl-candle": {
    "highlights": [
      {"title": "Playful Teddy Silhouette", "description": "A charming teddy-inspired form creates an instantly warm and playful visual identity."},
      {"title": "Character-Focused Detailing", "description": "The sculpted facial and body details give the candle a distinct handcrafted personality."},
      {"title": "Soft Decorative Appeal", "description": "Its gentle form works beautifully as a decorative accent beyond its candle function."},
      {"title": "Delightful Gifting Piece", "description": "A cheerful design suited to birthdays, celebrations and thoughtful everyday gifting."}
    ],
    "quote": "A little teddy, a little warmth."
  },
  "succulent-jar-candle": {
    "highlights": [
      {"title": "Botanical-Inspired Form", "description": "Succulent-inspired detailing brings a fresh, nature-led character to the candle."},
      {"title": "Layered Greenery Effect", "description": "The sculptural arrangement creates the appearance of a miniature botanical display."},
      {"title": "Jar-Based Presentation", "description": "The clean jar silhouette balances the organic succulent detailing with a refined finish."},
      {"title": "Nature-Led Décor", "description": "A versatile accent for desks, shelves, bedside tables and contemporary interiors."}
    ],
    "quote": "A tiny garden, softly glowing."
  },
  "floral-flower-box-candle": {
    "highlights": [
      {"title": "Flower-Box Composition", "description": "A floral arrangement transforms the candle into a miniature decorative bouquet."},
      {"title": "Sculpted Petal Detailing", "description": "Layered flower forms create visual depth and an artisanal handcrafted appearance."},
      {"title": "Elegant Arrangement", "description": "The compact presentation combines floral charm with the functional character of a candle."},
      {"title": "Celebration-Ready Design", "description": "Especially suited for gifting on birthdays, anniversaries and special occasions."}
    ],
    "quote": "Flowers that glow beyond the moment."
  },
  "pink-and-cream-floral-bowl-candle": {
    "highlights": [
      {"title": "Dual-Tone Floral Palette", "description": "Soft pink and cream tones create a delicate and sophisticated floral composition."},
      {"title": "Bowl-Shaped Silhouette", "description": "The rounded bowl form gives the candle a distinctive sculptural presence."},
      {"title": "Layered Floral Surface", "description": "Intricate floral detailing adds dimension and breaks away from conventional candle forms."},
      {"title": "Soft Romantic Character", "description": "Designed to bring a graceful, feminine accent to curated interiors."}
    ],
    "quote": "Soft petals, warm light."
  },
  "blue-and-white-floral-bowl-candle": {
    "highlights": [
      {"title": "Blue & White Contrast", "description": "The cool blue-and-white palette gives the floral design a crisp, elegant character."},
      {"title": "Sculptural Bowl Form", "description": "Its rounded silhouette creates a balanced decorative foundation for the floral detailing."},
      {"title": "Botanical Surface Work", "description": "Layered floral elements add texture and visual movement across the design."},
      {"title": "Refined Statement Décor", "description": "A distinctive choice for spaces that favour calm, contemporary decorative pieces."}
    ],
    "quote": "Where petals meet a cooler kind of glow."
  },
  "pink-floral-bouquet-candle": {
    "highlights": [
      {"title": "Bouquet-Inspired Form", "description": "A gathered arrangement of sculpted flowers gives the candle the appearance of a miniature bouquet."},
      {"title": "Petal-by-Petal Detailing", "description": "Layered petals create depth and make the floral structure visually expressive."},
      {"title": "Romantic Pink Character", "description": "The pink palette reinforces its soft, graceful and celebratory personality."},
      {"title": "Floral Gifting Appeal", "description": "A thoughtful alternative to conventional bouquets that can be enjoyed as décor."}
    ],
    "quote": "A bouquet made to glow."
  },
  "orange-floral-bouquet-candle": {
    "highlights": [
      {"title": "Warm Floral Composition", "description": "Rich orange tones give the bouquet-inspired design a lively and inviting character."},
      {"title": "Sculpted Flower Arrangement", "description": "Multiple floral forms create a dimensional composition rather than a flat decorative surface."},
      {"title": "Warm-Toned Personality", "description": "The vibrant palette adds energy and warmth to both modern and festive spaces."},
      {"title": "Statement Gifting Design", "description": "Its distinctive bouquet form makes it an eye-catching choice for celebratory gifting."}
    ],
    "quote": "A burst of flowers, captured in wax."
  },
  "caffe-latte-jar-candle": {
    "highlights": [
      {"title": "Café-Inspired Aesthetic", "description": "The warm palette and creamy appearance evoke the comforting character of a freshly made latte."},
      {"title": "Layered Visual Depth", "description": "Subtle tonal layering gives the jar candle a rich, dessert-like presentation."},
      {"title": "Minimal Jar Silhouette", "description": "The simple cylindrical form keeps the design clean while allowing the colour composition to stand out."},
      {"title": "Cozy Interior Accent", "description": "Perfect for creating a relaxed, warm atmosphere in intimate spaces."}
    ],
    "quote": "A little café comfort, lit."
  },
  "caff-latte-jar-candle": {
    "highlights": [
      {"title": "Café-Inspired Aesthetic", "description": "The warm palette and creamy appearance evoke the comforting character of a freshly made latte."},
      {"title": "Layered Visual Depth", "description": "Subtle tonal layering gives the jar candle a rich, dessert-like presentation."},
      {"title": "Minimal Jar Silhouette", "description": "The simple cylindrical form keeps the design clean while allowing the colour composition to stand out."},
      {"title": "Cozy Interior Accent", "description": "Perfect for creating a relaxed, warm atmosphere in intimate spaces."}
    ],
    "quote": "A little café comfort, lit."
  },
  "floral-boat-candle-collection": {
    "highlights": [
      {"title": "Distinctive Boat Silhouette", "description": "The elongated boat-inspired form gives this floral candle an unusual sculptural identity."},
      {"title": "Floral Arrangement Detail", "description": "Decorative flowers transform the vessel-like silhouette into an artistic botanical composition."},
      {"title": "Sculptural Balance", "description": "The contrast between the structured base and organic flowers creates visual interest."},
      {"title": "Decorative Centrepiece Appeal", "description": "Designed to work naturally as a table or display-piece accent."}
    ],
    "quote": "A floral journey in wax."
  },
  "orange-caramel-layered-jar-candle": {
    "highlights": [
      {"title": "Dessert-Inspired Layers", "description": "Warm caramel and orange tones create a visually rich, confectionery-inspired composition."},
      {"title": "Distinct Layer Definition", "description": "Contrasting layers give the candle depth and make its surface immediately eye-catching."},
      {"title": "Warm Colour Harmony", "description": "The combination of earthy caramel and vibrant orange creates a cosy, indulgent aesthetic."},
      {"title": "Comfort-Driven Décor", "description": "A playful piece for interiors that favour warm tones and inviting details."}
    ],
    "quote": "Layers of warmth, poured into light."
  },
  "floral-relief-pillar-candle": {
    "highlights": [
      {"title": "Raised Floral Relief", "description": "Botanical motifs emerge from the pillar surface to create a dimensional sculptural finish."},
      {"title": "Textured Surface Craft", "description": "The relief work adds tactile character and visual depth around the candle."},
      {"title": "Classic Pillar Foundation", "description": "Its traditional pillar silhouette provides a strong base for the intricate floral treatment."},
      {"title": "Timeless Decorative Character", "description": "A refined piece that works equally well in classic and contemporary settings."}
    ],
    "quote": "Where flowers become texture."
  },
  "rose-sculpture-pillar-candle": {
    "highlights": [
      {"title": "Sculpted Rose Form", "description": "A prominent rose motif gives the pillar an unmistakably romantic sculptural identity."},
      {"title": "Petal Definition", "description": "Layered petals create depth and make the flower appear naturally dimensional."},
      {"title": "Structured Pillar Base", "description": "The clean pillar foundation contrasts beautifully with the organic rose form."},
      {"title": "Romantic Statement Piece", "description": "Designed to function as both a candle and an elegant decorative sculpture."}
    ],
    "quote": "A rose, frozen in glow."
  },
  "snowman-christmas-candle": {
    "highlights": [
      {"title": "Festive Snowman Character", "description": "The instantly recognisable snowman form brings a playful seasonal personality."},
      {"title": "Winter-Themed Detailing", "description": "Character features create a cheerful handcrafted appearance associated with Christmas décor."},
      {"title": "Whimsical Silhouette", "description": "Its rounded sculptural form makes the candle visually engaging even when unlit."},
      {"title": "Christmas Gifting Appeal", "description": "A natural choice for festive hampers, Christmas tables and seasonal gifting."}
    ],
    "quote": "A little winter wonder, made to glow."
  },
  "pink-heart-scallop-jar-candle": {
    "highlights": [
      {"title": "Heart-Centred Design", "description": "The heart motif gives the candle a distinctly affectionate and romantic personality."},
      {"title": "Scalloped Edge Detailing", "description": "The softly scalloped form adds decorative rhythm around the jar silhouette."},
      {"title": "Soft Pink Character", "description": "Its gentle colour palette reinforces the warm, sentimental design language."},
      {"title": "Occasion-Focused Gifting", "description": "Especially suited to romantic gestures, anniversaries and heartfelt gifting."}
    ],
    "quote": "A heart-shaped way to say it."
  },
  "wavy-sculptural-pillar-candle": {
    "highlights": [
      {"title": "Fluid Wavy Silhouette", "description": "Curved contours replace the conventional straight pillar with a more expressive sculptural profile."},
      {"title": "Continuous Surface Movement", "description": "The flowing form creates changing highlights and shadows across the candle."},
      {"title": "Contemporary Sculptural Language", "description": "Its abstract geometry gives the piece a modern, gallery-inspired character."},
      {"title": "Standalone Décor Appeal", "description": "Designed to look intentional as a decorative object even before it is lit."}
    ],
    "quote": "Shape in motion, light at rest."
  },
  "crescent-moon-candle": {
    "highlights": [
      {"title": "Crescent-Inspired Silhouette", "description": "The unmistakable crescent shape gives this candle a strong celestial identity."},
      {"title": "Curved Sculptural Profile", "description": "Its sweeping form creates an elegant balance between negative space and solid wax."},
      {"title": "Celestial Decorative Character", "description": "The moon-inspired design introduces a dreamy, atmospheric element to interiors."},
      {"title": "Minimal Statement Piece", "description": "A distinctive sculptural candle for shelves, bedside spaces and curated displays."}
    ],
    "quote": "A little moonlight, made tangible."
  },
  "swan-sculptural-candle": {
    "highlights": [
      {"title": "Graceful Swan Form", "description": "The elegant swan silhouette gives the candle a refined and instantly recognisable character."},
      {"title": "Curved Neck Detailing", "description": "The flowing neck and body create a sense of movement within the sculptural form."},
      {"title": "Sculptural Elegance", "description": "Its graceful proportions make it feel closer to a decorative sculpture than a conventional candle."},
      {"title": "Sophisticated Décor Accent", "description": "Ideal for refined interiors and thoughtful gifting occasions."}
    ],
    "quote": "Grace, shaped in wax."
  },
  "black-abstract-sculptural-candle": {
    "highlights": [
      {"title": "Bold Abstract Geometry", "description": "An unconventional silhouette gives the candle a strong contemporary artistic identity."},
      {"title": "Monochromatic Character", "description": "The black finish creates a dramatic visual presence without relying on excessive ornamentation."},
      {"title": "Sculptural Surface Play", "description": "Its irregular contours create changing shadows and highlights from different angles."},
      {"title": "Modern Art-Inspired Décor", "description": "Designed for interiors that favour bold, minimal and statement-making objects."}
    ],
    "quote": "Less ornament. More attitude."
  },
  "ocean-wave-pillar-candle": {
    "highlights": [
      {"title": "Wave-Inspired Form", "description": "Flowing contours capture the movement and rhythm of ocean waves."},
      {"title": "Fluid Surface Detailing", "description": "Curved ridges create texture and visual motion around the pillar."},
      {"title": "Organic Sculptural Character", "description": "The natural wave language softens the traditional geometry of a pillar candle."},
      {"title": "Coastal Decorative Appeal", "description": "A calming accent for spaces inspired by nature, water and relaxed living."}
    ],
    "quote": "A wave, held in stillness."
  },
  "couple-embrace-sculptural-candle": {
    "highlights": [
      {"title": "Human-Figure Composition", "description": "Two embracing figures create an emotionally expressive sculptural silhouette."},
      {"title": "Intimate Form Detailing", "description": "The intertwined posture communicates connection through the shape itself."},
      {"title": "Symbolic Design Language", "description": "Rather than relying on decoration, the candle uses its sculptural form to tell a story."},
      {"title": "Meaningful Gifting Appeal", "description": "A memorable choice for couples, anniversaries and relationship milestones."}
    ],
    "quote": "Two forms, one moment."
  },
  "cat-sculptural-candle": {
    "highlights": [
      {"title": "Recognisable Cat Silhouette", "description": "The feline-inspired form gives the candle an instantly familiar personality."},
      {"title": "Character-Led Sculpting", "description": "Carefully shaped ears, body and posture create a playful sculptural presence."},
      {"title": "Minimal Animal Aesthetic", "description": "The design keeps the silhouette visually clean while retaining its distinctive character."},
      {"title": "Pet-Lover Appeal", "description": "A charming decorative piece for cat lovers and animal-inspired interiors."}
    ],
    "quote": "A quiet little companion, made of light."
  },
  "faceted-bowl-candle": {
    "highlights": [
      {"title": "Geometric Faceting", "description": "Multiple angled surfaces give the bowl a crisp, architectural appearance."},
      {"title": "Light-Responsive Texture", "description": "The facets naturally catch and reflect light, creating visual variation across the surface."},
      {"title": "Sculptural Bowl Profile", "description": "Its structured form transforms a simple vessel into a decorative object."},
      {"title": "Contemporary Interior Appeal", "description": "A strong fit for modern spaces that favour geometric and minimalist design."}
    ],
    "quote": "Geometry with a softer glow."
  },
  "ribbed-pumpkin-bowl-candle": {
    "highlights": [
      {"title": "Pumpkin-Inspired Silhouette", "description": "The rounded pumpkin form gives the candle a warm, organic decorative identity."},
      {"title": "Ribbed Surface Texture", "description": "Vertical ribbing creates tactile depth and emphasises the natural pumpkin-inspired structure."},
      {"title": "Soft Sculptural Volume", "description": "Its rounded proportions create a cosy and approachable visual character."},
      {"title": "Seasonal Décor Versatility", "description": "Works especially well with autumnal, festive and warm-toned interior styling."}
    ],
    "quote": "A little harvest, softly lit."
  },
  "seashell-sculptural-candle": {
    "highlights": [
      {"title": "Seashell-Inspired Form", "description": "The natural shell silhouette brings an unmistakable coastal character to the design."},
      {"title": "Organic Ridged Detailing", "description": "Curved ridges recreate the layered texture associated with seashells."},
      {"title": "Nature-Inspired Sculpting", "description": "The irregular organic form keeps the piece visually interesting from multiple angles."},
      {"title": "Coastal Décor Appeal", "description": "A distinctive accent for relaxed, beach-inspired and nature-led spaces."}
    ],
    "quote": "A piece of the shore, captured in wax."
  },
  "lavender-botanical-pillar-candle": {
    "highlights": [
      {"title": "Lavender-Inspired Detailing", "description": "Botanical lavender motifs bring a delicate natural character to the pillar."},
      {"title": "Raised Botanical Texture", "description": "The surface detailing adds depth while maintaining the clean structure of the candle."},
      {"title": "Refined Floral Character", "description": "The lavender theme creates a calm and understated decorative identity."},
      {"title": "Nature-Led Gifting", "description": "A graceful choice for botanical lovers and thoughtfully styled interiors."}
    ],
    "quote": "Quiet botanicals, warm light."
  },
  "sculptural-animal-bowl-candle": {
    "highlights": [
      {"title": "Animal-Inspired Composition", "description": "An expressive animal motif transforms the bowl into a character-led sculptural piece."},
      {"title": "Form Meets Function", "description": "The animal detailing is integrated into a functional bowl-like candle structure."},
      {"title": "Playful Sculptural Character", "description": "Organic animal forms give the design personality while maintaining decorative balance."},
      {"title": "Conversation-Worthy Décor", "description": "A distinctive piece for playful interiors, collectors and unconventional gifting."}
    ],
    "quote": "A little wildness, shaped in wax."
  },
  "teddy-bear-sculptural-candle": {
    "highlights": [
      {"title": "Classic Teddy Bear Form", "description": "The recognisable teddy silhouette creates a warm and nostalgic decorative character."},
      {"title": "Rounded Sculptural Proportions", "description": "Soft curves and compact proportions give the figure its comforting visual appeal."},
      {"title": "Character-Rich Craftsmanship", "description": "The sculpted body and facial details make the piece feel expressive rather than purely functional."},
      {"title": "Keepsake-Style Gifting", "description": "A memorable decorative candle suited to birthdays, celebrations and sentimental gifting."}
    ],
    "quote": "A timeless little bear, made to glow."
  }
}

# Update vinsho-commerce-seed.json
seed_path = 'vinsho-commerce-seed.json'
if os.path.exists(seed_path):
    with open(seed_path, 'r', encoding='utf-8') as f:
        seed_data = json.load(f)
    
    updated = 0
    for p in seed_data.get('products', []):
        slug = p.get('slug')
        if slug in data_map:
            p['highlights'] = data_map[slug]['highlights']
            p['features'] = data_map[slug]['highlights']
            p['closingLine'] = data_map[slug]['quote']
            p['closing_line'] = data_map[slug]['quote']
            p['highlightsTagline'] = data_map[slug]['quote']
            updated += 1

    with open(seed_path, 'w', encoding='utf-8') as f:
        json.dump(seed_data, f, indent=2, ensure_ascii=False)
    print(f"Updated {updated} products in {seed_path}")

# Update vinsho-taxonomy.json
tax_path = 'vinsho-taxonomy.json'
if os.path.exists(tax_path):
    with open(tax_path, 'r', encoding='utf-8') as f:
        tax_data = json.load(f)

    updated_tax = 0
    if isinstance(tax_data, dict) and 'products' in tax_data:
        for p in tax_data['products']:
            slug = p.get('slug')
            if slug in data_map:
                p['highlights'] = data_map[slug]['highlights']
                p['features'] = data_map[slug]['highlights']
                p['closingLine'] = data_map[slug]['quote']
                p['closing_line'] = data_map[slug]['quote']
                p['highlightsTagline'] = data_map[slug]['quote']
                updated_tax += 1

    with open(tax_path, 'w', encoding='utf-8') as f:
        json.dump(tax_data, f, indent=2, ensure_ascii=False)
    print(f"Updated {updated_tax} products in {tax_path}")
