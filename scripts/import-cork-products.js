import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const rootDir = process.cwd();
const productsJsonPath = path.join(rootDir, 'vinsho_products.json');
const seedJsonPath = path.join(rootDir, 'vinsho-commerce-seed.json');
const dbPath = path.join(rootDir, 'data', 'vinsho.db');

const corkDataset = [
  {
    "sku": "CORK-CMB-10",
    "slug": "combo-10-cork-executive-essentials",
    "name": "Combo 10 — Cork Executive Essentials",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "Everything on your desk. Nothing on the planet.",
    "description": "A five-piece cork essentials set that carries your workday from desk to travel. The A5 diary, card stacker, key chain and metal pen tuck neatly into a cork canvas sleeve — a complete, considered gift that looks premium and leaves nothing behind.",
    "features": [
      { "title": "Complete Desk-to-Travel Set", "description": "Five coordinated pieces that work together as one polished kit." },
      { "title": "Natural Cork Finish", "description": "Warm, tactile grain that ages beautifully and feels premium in hand." },
      { "title": "Ready to Gift", "description": "Arrives as a cohesive set — no extra wrapping or assembly needed." },
      { "title": "Sustainable by Design", "description": "Renewable, biodegradable cork throughout." }
    ],
    "closing_line": "Everything on your desk. Nothing on the planet.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-11",
    "slug": "combo-11-cork-signature-desk-set",
    "name": "Combo 11 — Cork Signature Desk Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "A desk that works as beautifully as it looks.",
    "description": "Six pieces built around the cork signature desk organizer — a wavy photo frame, square clock and two tea light holders, all presented in a premium cork box. A warm, complete desk upgrade for the people you want to thank properly.",
    "features": [
      { "title": "Signature Desk Organizer", "description": "Dedicated slots for pens, clips and daily desk essentials." },
      { "title": "Warm Ambient Touch", "description": "Two cork tea light holders bring softness to the workspace." },
      { "title": "Premium Cork Box", "description": "Presentation-ready packaging that is part of the gift." },
      { "title": "Built to Last", "description": "Durable cork construction for everyday desk use." }
    ],
    "closing_line": "A desk that works as beautifully as it looks.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-12",
    "slug": "combo-12-cork-traveller-set",
    "name": "Combo 12 — Cork Traveller Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "For the ones always on the move.",
    "description": "A travel-ready cork set pairing a passport holder and perpetual cork calendar with a Borosil glass bottle finished in cork veneer, plus a glass tea light holder — all housed in a premium cork box.",
    "features": [
      { "title": "Travel Ready", "description": "Passport holder and bottle sized for carry-on and daily commute." },
      { "title": "Borosil Glass Bottle", "description": "Quality glass body wrapped in a cork veneer sleeve." },
      { "title": "Perpetual Cork Calendar", "description": "A desk piece that never needs replacing." },
      { "title": "Premium Cork Box", "description": "Gift-ready presentation straight out of the carton." }
    ],
    "closing_line": "For the ones always on the move.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-13",
    "slug": "combo-13-cork-desk-grow-set",
    "name": "Combo 13 — Cork Desk & Grow Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "Work. Grow. Repeat.",
    "description": "A cork tray anchors this set — pen holder, conical flask planter and three motivational cork blocks that bring a little green and a little encouragement to the desk. Ideal for onboarding kits and team milestones.",
    "features": [
      { "title": "Living Desk Accent", "description": "Conical flask planter keeps a plant thriving beside you." },
      { "title": "Motivational Blocks", "description": "Three printed cork blocks to reset the mood mid-day." },
      { "title": "Organised Surface", "description": "Tray and pen holder keep the desk tidy and intentional." },
      { "title": "Great for Team Gifting", "description": "Scales cleanly across onboarding and milestone kits." }
    ],
    "closing_line": "Work. Grow. Repeat.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-14",
    "slug": "combo-14-cork-hosting-set",
    "name": "Combo 14 — Cork Hosting Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "Serve warm. Serve sustainable.",
    "description": "An eight-piece hosting set on a cork tray — two borosilicate jars with cork lids, four cork belly coasters and a cork belly tea light holder. Made for tables that get used, not just admired.",
    "features": [
      { "title": "Complete Hosting Kit", "description": "Tray, jars, coasters and tea light in one coordinated set." },
      { "title": "Borosilicate Jars", "description": "Heat-safe glass with snug natural cork lids." },
      { "title": "Cork Belly Finish", "description": "Distinctive bark-grain texture on coasters and tea light holder." },
      { "title": "Everyday Durable", "description": "Wipes clean and holds up to regular use." }
    ],
    "closing_line": "Serve warm. Serve sustainable.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-29",
    "slug": "combo-29-cork-diary-pen-set",
    "name": "Combo 29 — Cork Diary & Pen Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "Simple. Considered. Complete.",
    "description": "The cleanest way to gift well — a cork A5 diary paired with a cork metal pen. Understated, useful, and appropriate for every recipient on the list.",
    "features": [
      { "title": "Cork A5 Diary", "description": "Natural cork cover with a smooth, writable interior." },
      { "title": "Cork Metal Pen", "description": "Weighted metal body with a cork grip section." },
      { "title": "Universally Appropriate", "description": "Works for clients, employees and event giveaways alike." },
      { "title": "Easy to Scale", "description": "A two-piece set that stays affordable at volume." }
    ],
    "closing_line": "Simple. Considered. Complete.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-30",
    "slug": "combo-30-cork-printed-diary-pen-set",
    "name": "Combo 30 — Cork Printed Diary & Pen Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "Classic set. Bolder cover.",
    "description": "The same trusted diary-and-pen pairing, upgraded with a printed cork A5 diary. Pattern-forward for teams and occasions that want a little more personality.",
    "features": [
      { "title": "Cork A5 Printed Diary", "description": "Statement print applied directly onto natural cork." },
      { "title": "Cork Metal Pen", "description": "Weighted metal body with a cork grip section." },
      { "title": "Distinctive Look", "description": "Stands apart from plain-cover corporate stationery." },
      { "title": "Compact Gifting", "description": "Two pieces, presentation-ready, easy to ship." }
    ],
    "closing_line": "Classic set. Bolder cover.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-36",
    "slug": "combo-36-cork-workstation-set",
    "name": "Combo 36 — Cork Workstation Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "A full desk, in one box.",
    "description": "Five pieces that cover the working surface end to end — A5 diary, small cork calendar, pen stand, super fine grain mouse pad and cork metal pen. A practical, everyday-use gift for hybrid and in-office teams.",
    "features": [
      { "title": "Super Fine Grain Mouse Pad", "description": "Smooth cork surface with reliable grip underneath." },
      { "title": "Pen Stand & Calendar", "description": "Keeps the desk organised and the month in view." },
      { "title": "Daily-Use Pieces", "description": "Every item earns its place on the desk." },
      { "title": "Cohesive Cork Finish", "description": "Matched grain across all five pieces." }
    ],
    "closing_line": "A full desk, in one box.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-37",
    "slug": "combo-37-cork-desk-travel-set",
    "name": "Combo 37 — Cork Desk & Travel Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "From the desk to the departure gate.",
    "description": "A four-piece set that bridges work and travel — cork A5 diary, big cork calendar, Granco passport holder and cork metal pen. Built for people whose week moves between both.",
    "features": [
      { "title": "Cork Calendar Big", "description": "Larger perpetual blocks, easy to read across the room." },
      { "title": "Passport Holder Granco", "description": "Slim cork travel wallet that protects the essentials." },
      { "title": "Work and Travel Ready", "description": "Covers both halves of a moving schedule." },
      { "title": "Premium Cork Throughout", "description": "Consistent natural finish across every piece." }
    ],
    "closing_line": "From the desk to the departure gate.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-44",
    "slug": "combo-44-cork-premium-desk-collection",
    "name": "Combo 44 — Cork Premium Desk Collection",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "The complete desk. Ten pieces of it.",
    "description": "The most generous set in the range — cork square tray, desktop organizer, four premium 8mm coasters, a cork bark planter and three tea light holders. A ten-piece collection for senior gifting and marquee occasions.",
    "features": [
      { "title": "Ten-Piece Collection", "description": "The fullest cork desk set in the range." },
      { "title": "8mm Premium Coasters", "description": "Extra thickness for a substantial, protective feel." },
      { "title": "Cork Bark Planter", "description": "Raw bark texture that brings the outdoors in." },
      { "title": "Senior Gifting Ready", "description": "Scaled and finished for leadership and key clients." }
    ],
    "closing_line": "The complete desk. Ten pieces of it.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-45",
    "slug": "combo-45-cork-lenia-laptop-set",
    "name": "Combo 45 — Cork Lenia Laptop Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Corporate Gifting Combos",
    "tagline": "Carry it all. Lightly.",
    "description": "A three-piece carry set built around the Lenia cork laptop bag, paired with a cork A5 diary and cork key chain. Everything needed for the commute, in one considered finish.",
    "features": [
      { "title": "Cork Laptop Bag Lenia", "description": "Structured cork bag with a detachable shoulder strap." },
      { "title": "Matched Accessories", "description": "Diary and key chain finished in the same cork grain." },
      { "title": "Commute Ready", "description": "Fits the laptop, the notes and the keys." },
      { "title": "Lightweight Build", "description": "Cork keeps the bag light without giving up structure." }
    ],
    "closing_line": "Carry it all. Lightly.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-18",
    "slug": "combo-18-executive-laptop-set-ocean-mist",
    "name": "Combo 18 — Executive Laptop Set (Ocean Mist)",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Premium Executive Combos",
    "tagline": "Executive presence. Natural finish.",
    "description": "A three-piece executive set in the Ocean Mist design — cork laptop bag, Borosil glass bottle with a cork fabric sleeve and a matching cork passport holder. Coordinated end to end for senior gifting and client presentation.",
    "features": [
      { "title": "Cork Laptop Bag", "description": "Structured carry with a leather-look front panel and top handles." },
      { "title": "Borosil Glass Bottle", "description": "Quality glass body in a protective cork fabric sleeve." },
      { "title": "Cork Passport Holder", "description": "Slim travel wallet finished to match the set." },
      { "title": "Ocean Mist Design", "description": "Colour and pattern carried consistently across all three pieces." }
    ],
    "closing_line": "Executive presence. Natural finish.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-19",
    "slug": "combo-19-executive-laptop-set-deep-blue",
    "name": "Combo 19 — Executive Laptop Set (Deep Blue)",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Premium Executive Combos",
    "tagline": "Executive presence. Natural finish.",
    "description": "A three-piece executive set in the Deep Blue design — cork laptop bag, Borosil glass bottle with a cork fabric sleeve and a matching cork passport holder. Coordinated end to end for senior gifting and client presentation.",
    "features": [
      { "title": "Cork Laptop Bag", "description": "Structured carry with a leather-look front panel and top handles." },
      { "title": "Borosil Glass Bottle", "description": "Quality glass body in a protective cork fabric sleeve." },
      { "title": "Cork Passport Holder", "description": "Slim travel wallet finished to match the set." },
      { "title": "Deep Blue Design", "description": "Colour and pattern carried consistently across all three pieces." }
    ],
    "closing_line": "Executive presence. Natural finish.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-20",
    "slug": "combo-20-executive-laptop-set-brown",
    "name": "Combo 20 — Executive Laptop Set (Brown)",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Premium Executive Combos",
    "tagline": "Executive presence. Natural finish.",
    "description": "A three-piece executive set in the Brown design — cork laptop bag, Borosil glass bottle with a cork fabric sleeve and a matching cork passport holder. Coordinated end to end for senior gifting and client presentation.",
    "features": [
      { "title": "Cork Laptop Bag", "description": "Structured carry with a leather-look front panel and top handles." },
      { "title": "Borosil Glass Bottle", "description": "Quality glass body in a protective cork fabric sleeve." },
      { "title": "Cork Passport Holder", "description": "Slim travel wallet finished to match the set." },
      { "title": "Brown Design", "description": "Colour and pattern carried consistently across all three pieces." }
    ],
    "closing_line": "Executive presence. Natural finish.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-46",
    "slug": "combo-46-cork-printed-hosting-set",
    "name": "Combo 46 — Cork Printed Hosting Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Occasional Gifting Combos",
    "tagline": "Festive tables, thoughtfully set.",
    "description": "An eight-piece occasion set — cork square tray, four printed coasters, a printed tabletop planter and two square tealight holders. Colour-forward cork for festivals, housewarmings and celebration gifting.",
    "features": [
      { "title": "Printed Cork Finish", "description": "Vivid patterns applied onto natural cork surfaces." },
      { "title": "Complete Table Set", "description": "Tray, coasters, planter and tealights in one box." },
      { "title": "Festive Ready", "description": "Built for Diwali, housewarmings and celebration gifting." },
      { "title": "Everyday Usable", "description": "Looks festive, works long after the occasion." }
    ],
    "closing_line": "Festive tables, thoughtfully set.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CMB-47",
    "slug": "combo-47-cork-bark-hosting-set",
    "name": "Combo 47 — Cork Bark Hosting Set",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Occasional Gifting Combos",
    "tagline": "Raw texture. Refined table.",
    "description": "A seven-piece set in natural bark cork — round tray, four veneer coasters, a bark planter and a 3-in-1 bark tea light holder. Earthy and understated for gifting that leans natural rather than printed.",
    "features": [
      { "title": "Natural Bark Texture", "description": "Raw cork bark finish with genuine surface variation." },
      { "title": "3-in-1 Tea Light Holder", "description": "One piece, three configurations for the table." },
      { "title": "Veneer Coasters", "description": "Four coasters with a fine cork veneer face." },
      { "title": "Understated Gifting", "description": "Neutral palette that suits any interior." }
    ],
    "closing_line": "Raw texture. Refined table.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-PL-PL1",
    "slug": "box-print-planter-cork-table-top-planter",
    "name": "Box Print Planter — Cork Table Top Planter",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Table Top Planters",
    "tagline": "Bring green to every corner.",
    "description": "A 10 x 10 cm cork tabletop planter finished in mosaic-tile print in warm reds and blues. Lightweight, naturally insulating and sized for desks, shelves and windowsills.",
    "features": [
      { "title": "Natural Cork Body", "description": "Insulating cork that protects roots from temperature swings." },
      { "title": "Desk & Shelf Sized", "description": "10 x 10 cm footprint fits any surface." },
      { "title": "Distinctive Finish", "description": "Mosaic-tile print in warm reds and blues." },
      { "title": "Lightweight", "description": "Easy to lift, rearrange and reposition." }
    ],
    "closing_line": "Bring green to every corner.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-PL-PL2",
    "slug": "bohemian-print-planter-cork-table-top-planter",
    "name": "Bohemian Print Planter — Cork Table Top Planter",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Table Top Planters",
    "tagline": "Bring green to every corner.",
    "description": "A 10 x 10 cm cork tabletop planter finished in geometric bohemian motif in deep blue and olive. Lightweight, naturally insulating and sized for desks, shelves and windowsills.",
    "features": [
      { "title": "Natural Cork Body", "description": "Insulating cork that protects roots from temperature swings." },
      { "title": "Desk & Shelf Sized", "description": "10 x 10 cm footprint fits any surface." },
      { "title": "Distinctive Finish", "description": "Geometric bohemian motif in deep blue and olive." },
      { "title": "Lightweight", "description": "Easy to lift, rearrange and reposition." }
    ],
    "closing_line": "Bring green to every corner.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-PL-PL3",
    "slug": "diamond-planter-cork-table-top-planter",
    "name": "Diamond Planter — Cork Table Top Planter",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Table Top Planters",
    "tagline": "Bring green to every corner.",
    "description": "A 10 x 10 cm cork tabletop planter finished in fine diamond-tile pattern in soft terracotta tones. Lightweight, naturally insulating and sized for desks, shelves and windowsills.",
    "features": [
      { "title": "Natural Cork Body", "description": "Insulating cork that protects roots from temperature swings." },
      { "title": "Desk & Shelf Sized", "description": "10 x 10 cm footprint fits any surface." },
      { "title": "Distinctive Finish", "description": "Fine diamond-tile pattern in soft terracotta tones." },
      { "title": "Lightweight", "description": "Easy to lift, rearrange and reposition." }
    ],
    "closing_line": "Bring green to every corner.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-PL-PL4",
    "slug": "feather-planter-cork-table-top-planter",
    "name": "Feather Planter — Cork Table Top Planter",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Table Top Planters",
    "tagline": "Bring green to every corner.",
    "description": "A 10 x 10 cm cork tabletop planter finished in scattered feather motif in muted earth shades. Lightweight, naturally insulating and sized for desks, shelves and windowsills.",
    "features": [
      { "title": "Natural Cork Body", "description": "Insulating cork that protects roots from temperature swings." },
      { "title": "Desk & Shelf Sized", "description": "10 x 10 cm footprint fits any surface." },
      { "title": "Distinctive Finish", "description": "Scattered feather motif in muted earth shades." },
      { "title": "Lightweight", "description": "Easy to lift, rearrange and reposition." }
    ],
    "closing_line": "Bring green to every corner.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-PL-PL5",
    "slug": "olive-planter-cork-table-top-planter",
    "name": "Olive Planter — Cork Table Top Planter",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Table Top Planters",
    "tagline": "Bring green to every corner.",
    "description": "A 10 x 10 cm cork tabletop planter finished in natural olive-grain cork with organic speckling. Lightweight, naturally insulating and sized for desks, shelves and windowsills.",
    "features": [
      { "title": "Natural Cork Body", "description": "Insulating cork that protects roots from temperature swings." },
      { "title": "Desk & Shelf Sized", "description": "10 x 10 cm footprint fits any surface." },
      { "title": "Distinctive Finish", "description": "Natural olive-grain cork with organic speckling." },
      { "title": "Lightweight", "description": "Easy to lift, rearrange and reposition." }
    ],
    "closing_line": "Bring green to every corner.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-PL-PL6",
    "slug": "chocochip-planter-cork-table-top-planter",
    "name": "Chocochip Planter — Cork Table Top Planter",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Table Top Planters",
    "tagline": "Bring green to every corner.",
    "description": "A 10 x 10 cm cork tabletop planter finished in dark-fleck chocochip grain on natural cork. Lightweight, naturally insulating and sized for desks, shelves and windowsills.",
    "features": [
      { "title": "Natural Cork Body", "description": "Insulating cork that protects roots from temperature swings." },
      { "title": "Desk & Shelf Sized", "description": "10 x 10 cm footprint fits any surface." },
      { "title": "Distinctive Finish", "description": "Dark-fleck chocochip grain on natural cork." },
      { "title": "Lightweight", "description": "Easy to lift, rearrange and reposition." }
    ],
    "closing_line": "Bring green to every corner.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CO-01",
    "slug": "cork-belly-coaster",
    "name": "Cork Belly Coaster",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Coasters",
    "tagline": "Protect the table. Elevate it too.",
    "description": "Genuine cork bark face with natural ring detailing. Naturally heat-resistant and moisture-absorbent, cork keeps rings and heat marks off the surface while adding warmth to the setting. Size 100 mm x 8 mm.",
    "features": [
      { "title": "Heat & Moisture Resistant", "description": "Absorbs condensation and shields against hot mugs." },
      { "title": "Natural Cork Grip", "description": "Stays put on the table and never scratches the surface." },
      { "title": "Distinctive Finish", "description": "Genuine cork bark face with natural ring detailing." },
      { "title": "Practical Detail", "description": "Substantial 8 mm thickness for a solid, protective feel." }
    ],
    "closing_line": "Protect the table. Elevate it too.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CO-02",
    "slug": "cork-leaf-shape-coaster",
    "name": "Cork Leaf Shape Coaster",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Coasters",
    "tagline": "Protect the table. Elevate it too.",
    "description": "Sculpted leaf silhouette in fine-grain cork. Naturally heat-resistant and moisture-absorbent, cork keeps rings and heat marks off the surface while adding warmth to the setting. Size 120 mm x 5 mm.",
    "features": [
      { "title": "Heat & Moisture Resistant", "description": "Absorbs condensation and shields against hot mugs." },
      { "title": "Natural Cork Grip", "description": "Stays put on the table and never scratches the surface." },
      { "title": "Distinctive Finish", "description": "Sculpted leaf silhouette in fine-grain cork." },
      { "title": "Practical Detail", "description": "Distinctive shape that doubles as table decor." }
    ],
    "closing_line": "Protect the table. Elevate it too.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CO-03",
    "slug": "cork-diamond-uv-print-coaster",
    "name": "Cork Diamond UV Print Coaster",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Coasters",
    "tagline": "Protect the table. Elevate it too.",
    "description": "Diamond-tile UV print in blue and terracotta. Naturally heat-resistant and moisture-absorbent, cork keeps rings and heat marks off the surface while adding warmth to the setting. Size 100 mm x 5 mm.",
    "features": [
      { "title": "Heat & Moisture Resistant", "description": "Absorbs condensation and shields against hot mugs." },
      { "title": "Natural Cork Grip", "description": "Stays put on the table and never scratches the surface." },
      { "title": "Distinctive Finish", "description": "Diamond-tile UV print in blue and terracotta." },
      { "title": "Practical Detail", "description": "UV printing that resists fading and wear." }
    ],
    "closing_line": "Protect the table. Elevate it too.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CO-04",
    "slug": "cork-box-print-coaster",
    "name": "Cork Box Print Coaster",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Coasters",
    "tagline": "Protect the table. Elevate it too.",
    "description": "Bold mosaic box print in warm festive tones. Naturally heat-resistant and moisture-absorbent, cork keeps rings and heat marks off the surface while adding warmth to the setting. Size 100 mm x 5 mm.",
    "features": [
      { "title": "Heat & Moisture Resistant", "description": "Absorbs condensation and shields against hot mugs." },
      { "title": "Natural Cork Grip", "description": "Stays put on the table and never scratches the surface." },
      { "title": "Distinctive Finish", "description": "Bold mosaic box print in warm festive tones." },
      { "title": "Practical Detail", "description": "Vivid pattern that lifts an everyday table." }
    ],
    "closing_line": "Protect the table. Elevate it too.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-CO-05",
    "slug": "cork-coaster-with-stand",
    "name": "Cork Coaster with Stand",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Coasters",
    "tagline": "Protect the table. Elevate it too.",
    "description": "Engraved cork coasters with a metal display stand. Naturally heat-resistant and moisture-absorbent, cork keeps rings and heat marks off the surface while adding warmth to the setting. Size 100 mm x 8 mm.",
    "features": [
      { "title": "Heat & Moisture Resistant", "description": "Absorbs condensation and shields against hot mugs." },
      { "title": "Natural Cork Grip", "description": "Stays put on the table and never scratches the surface." },
      { "title": "Distinctive Finish", "description": "Engraved cork coasters with a metal display stand." },
      { "title": "Practical Detail", "description": "Stand keeps the set together and off the table." }
    ],
    "closing_line": "Protect the table. Elevate it too.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  },
  {
    "sku": "CORK-TR-01",
    "slug": "cork-olive-square-trivet",
    "name": "Cork Olive Square Trivet",
    "collection": "Gifting Collection",
    "category": "Cork Products",
    "subcategory": "Cork Trivets",
    "tagline": "Set it down. Safely.",
    "description": "Olive-grain cork square with a jute hanging loop. Cork is naturally heat-resistant, so hot pots, pans and serving dishes come straight from the stove to the table without a mark. Size 18 cm X 18 cm X thk 15 mm.",
    "features": [
      { "title": "Heat Resistant", "description": "Takes hot cookware directly off the flame." },
      { "title": "Protects Every Surface", "description": "Shields wood, glass and stone from heat and scratches." },
      { "title": "Distinctive Form", "description": "Olive-grain cork square with a jute hanging loop." },
      { "title": "Everyday Durable", "description": "Holds shape and finish through regular kitchen use." }
    ],
    "closing_line": "Set it down. Safely.",
    "material": "Natural cork",
    "source": "Cork Dataset"
  }
];

const existingProductsJson = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
const seedData = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8'));
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure missing columns exist
const cols = db.prepare("PRAGMA table_info(products)").all();
const colNames = new Set(cols.map((c) => c.name));
if (!colNames.has('tagline')) db.exec("ALTER TABLE products ADD COLUMN tagline TEXT DEFAULT ''");
if (!colNames.has('features')) db.exec("ALTER TABLE products ADD COLUMN features TEXT DEFAULT '[]'");
if (!colNames.has('closing_line')) db.exec("ALTER TABLE products ADD COLUMN closing_line TEXT DEFAULT ''");
if (!colNames.has('sku')) db.exec("ALTER TABLE products ADD COLUMN sku TEXT");

// Fetch taxonomy collection & subcategory IDs
const colRows = db.prepare('SELECT id, key FROM collections').all();
const subRows = db.prepare('SELECT id, key FROM subcategories').all();

const colMap = new Map(colRows.map(c => [c.key, c.id]));
const subMap = new Map(subRows.map(s => [s.key, s.id]));

const giftingColId = colMap.get('gifting-collection') || colRows[0].id;
const corporateSubId = subMap.get('corporate-gifting') || subRows[0].id;

const now = new Date().toISOString();

const updateProductStmt = db.prepare(`
  UPDATE products
  SET name = ?,
      tagline = ?,
      description = ?,
      features = ?,
      closing_line = ?,
      material = ?,
      sku = ?,
      description_source = ?,
      updated_at = ?
  WHERE slug = ?
`);

const insertDraftProductStmt = db.prepare(`
  INSERT INTO products (
    slug, name, collection_id, subcategory_id, description, description_source,
    tagline, features, closing_line, material, sku, shipping_class, launch_phase,
    sellable_online, returnable, country_of_origin, is_purchasable, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'standard', 0, 0, 1, 'India', 0, ?, ?)
`);

const insertImageStmt = db.prepare(`
  INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
  VALUES (?, ?, ?, 1, 1, ?, ?)
`);

let matchedCount = 0;
let createdCount = 0;

db.transaction(() => {
  for (const item of corkDataset) {
    const featuresJsonStr = JSON.stringify(item.features || []);

    // 1. Update vinsho_products.json list
    const pIdx = existingProductsJson.findIndex(p => p.slug === item.slug || (p.sku && p.sku === item.sku));
    if (pIdx > -1) {
      existingProductsJson[pIdx] = {
        ...existingProductsJson[pIdx],
        name: item.name,
        tagline: item.tagline,
        description: item.description,
        features: item.features,
        closing_line: item.closing_line,
        source: item.source,
        sku: item.sku,
        material: item.material
      };
    } else {
      existingProductsJson.push({
        id: existingProductsJson.length + 1,
        slug: item.slug,
        sku: item.sku,
        name: item.name,
        category: item.category,
        collection: item.collection,
        subcategory: item.subcategory,
        tagline: item.tagline,
        description: item.description,
        features: item.features,
        closing_line: item.closing_line,
        source: item.source,
        material: item.material
      });
    }

    // 2. Upsert into SQLite DB
    const existingDbProd = db.prepare('SELECT id FROM products WHERE slug = ?').get(item.slug);

    if (existingDbProd) {
      updateProductStmt.run(
        item.name,
        item.tagline,
        item.description,
        featuresJsonStr,
        item.closing_line,
        item.material,
        item.sku,
        item.source,
        now,
        item.slug
      );
      matchedCount++;
    } else {
      const res = insertDraftProductStmt.run(
        item.slug,
        item.name,
        giftingColId,
        corporateSubId,
        item.description,
        item.source,
        item.tagline,
        featuresJsonStr,
        item.closing_line,
        item.material,
        item.sku,
        now,
        now
      );

      const newId = res.lastInsertRowid;
      const placeholderImg = `https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=1000`;
      insertImageStmt.run(newId, placeholderImg, item.name, now, now);
      createdCount++;
    }

    // 3. Upsert into vinsho-commerce-seed.json
    const seedIdx = seedData.products.findIndex(p => p.slug === item.slug || (p.sku && p.sku === item.sku));
    const placeholderImg = `https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=1000`;
    
    if (seedIdx > -1) {
      const target = seedData.products[seedIdx];
      target.name = item.name;
      target.tagline = item.tagline;
      target.description = item.description;
      target.features = item.features;
      target.closing_line = item.closing_line;
      target.closingLine = item.closing_line;
      target.sku = item.sku;
      target.material = item.material;
      target.descriptionSource = item.source;
    } else {
      seedData.products.push({
        slug: item.slug,
        sku: item.sku,
        name: item.name,
        collection: 'Gifting Collection',
        collectionKey: 'gifting-collection',
        subcategory: 'Corporate Gifting',
        subcategoryKey: 'corporate-gifting',
        image: placeholderImg,
        material: item.material,
        description: item.description,
        descriptionSource: item.source,
        tagline: item.tagline,
        features: item.features,
        closing_line: item.closing_line,
        closingLine: item.closing_line,
        shippingClass: 'standard',
        launchPhase: 0,
        sellableOnline: false,
        returnable: true,
        isPurchasable: false,
        mrp: null,
        sellingPrice: null,
        currency: 'INR',
        stock: null,
        variants: [],
        countryOfOrigin: 'India'
      });
    }
  }
})();

// Write updated files
fs.writeFileSync(productsJsonPath, JSON.stringify(existingProductsJson, null, 2), 'utf8');
fs.writeFileSync(seedJsonPath, JSON.stringify(seedData, null, 2), 'utf8');

console.log('Cork Dataset import completed successfully!');
console.log(`Matched: ${matchedCount}, Created New Drafts: ${createdCount}`);
