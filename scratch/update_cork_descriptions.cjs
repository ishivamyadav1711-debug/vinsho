const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const rootDir = process.cwd();
const seedPath = path.join(rootDir, 'vinsho-commerce-seed.json');
const productsJsonPath = path.join(rootDir, 'vinsho_products.json');
const dbPath = path.join(rootDir, 'data', 'vinsho.db');

const corkDescriptions = [
  {
    num: 1,
    slug: "cork-diary-as-fab-india-combo-30",
    features: [
      { title: "Refined Cork Cover", description: "A naturally textured cork exterior gives the diary a warm, sophisticated character." },
      { title: "Everyday Writing Companion", description: "Designed for notes, ideas, plans, and professional everyday use." },
      { title: "Corporate Character", description: "Its understated finish makes it especially suited to professional gifting." },
      { title: "Functional Elegance", description: "A practical stationery essential with a distinctive natural-material appeal." }
    ],
    tagline: "Thoughts deserve a beautifully crafted place to live."
  },
  {
    num: 2,
    slug: "cork-metal-pen-combo-30",
    features: [
      { title: "Cork-Inspired Detail", description: "A refined cork finish brings warmth and individuality to a classic writing essential." },
      { title: "Metal Precision", description: "The metal construction adds a polished, professional presence." },
      { title: "Executive Appeal", description: "Designed to complement notebooks, diaries, and corporate desk collections." },
      { title: "Gift-Ready Essential", description: "A simple yet distinctive accessory for everyday writing and gifting." }
    ],
    tagline: "Write with purpose, carry it with character."
  },
  {
    num: 3,
    slug: "ecodesk-diary-combo-10",
    features: [
      { title: "Contemporary Desk Essential", description: "A clean diary design created to complement modern professional spaces." },
      { title: "Natural Visual Language", description: "Its cork-inspired character introduces warmth into everyday stationery." },
      { title: "Organised Thinking", description: "Made for capturing schedules, notes, ideas, and important moments." },
      { title: "Professional Presentation", description: "A polished choice for office use, events, and corporate gifting." }
    ],
    tagline: "Where thoughtful ideas meet thoughtful design."
  },
  {
    num: 4,
    slug: "cork-card-stacker-combo-10",
    features: [
      { title: "Organized Presentation", description: "Keeps visiting cards neatly arranged and readily accessible." },
      { title: "Compact Form", description: "Its streamlined silhouette fits naturally into professional desk environments." },
      { title: "Natural Texture", description: "Cork adds a warm tactile quality to an otherwise functional accessory." },
      { title: "Desk-Smart Design", description: "A subtle way to bring organisation and character to the workspace." }
    ],
    tagline: "Keep every introduction within easy reach."
  },
  {
    num: 5,
    slug: "key-chain-combo-10",
    features: [
      { title: "Compact Character", description: "A small everyday accessory elevated through the warmth of cork." },
      { title: "Tactile Finish", description: "The natural texture adds visual interest and a comfortable hand feel." },
      { title: "Everyday Utility", description: "Designed to keep keys together while adding a distinctive personal touch." },
      { title: "Gifting Essential", description: "An easy addition to corporate hampers and curated gift sets." }
    ],
    tagline: "Small detail. Lasting impression."
  },
  {
    num: 6,
    slug: "cork-metal-pen-combo-10",
    features: [
      { title: "Natural & Polished", description: "The contrast between cork texture and metal detailing creates a refined look." },
      { title: "Writing Essential", description: "Designed for everyday notes, signatures, meetings, and ideas." },
      { title: "Executive Styling", description: "Its understated appearance fits naturally into professional stationery collections." },
      { title: "Thoughtful Gifting", description: "A practical accessory that feels personal without being overly elaborate." }
    ],
    tagline: "A familiar essential, crafted with a natural touch."
  },
  {
    num: 7,
    slug: "cork-canvas-sleeve-combo-10",
    features: [
      { title: "Textured Surface", description: "Cork and canvas-inspired detailing create a relaxed yet sophisticated appearance." },
      { title: "Protective Silhouette", description: "Designed as a practical sleeve for carrying everyday essentials." },
      { title: "Contemporary Utility", description: "Its clean profile works equally well in professional and casual settings." },
      { title: "Distinctive Craftsmanship", description: "Natural-looking materials give the piece a tactile, crafted personality." }
    ],
    tagline: "Carry your essentials with understated character."
  },
  {
    num: 8,
    slug: "ocean-mist-bag-combo-18",
    features: [
      { title: "Ocean-Inspired Palette", description: "A calm visual character inspired by the freshness and serenity of coastal tones." },
      { title: "Practical Carrying Form", description: "Designed to bring everyday utility into a refined gifting collection." },
      { title: "Contemporary Personality", description: "Its distinctive styling adds a modern touch to cork-based accessories." },
      { title: "Statement Detail", description: "A functional bag with enough character to stand apart from ordinary accessories." }
    ],
    tagline: "A breath of the coast, carried wherever you go."
  },
  {
    num: 9,
    slug: "passport-holder-ocean-mist-combo-18",
    features: [
      { title: "Travel-Ready Form", description: "Designed to keep a passport organised while travelling." },
      { title: "Ocean Mist Character", description: "Its calm visual language brings a fresh, contemporary personality to travel essentials." },
      { title: "Natural Texture", description: "Cork detailing adds warmth and tactile interest to the compact design." },
      { title: "Refined Travel Companion", description: "A thoughtful accessory for travel gifting and curated corporate sets." }
    ],
    tagline: "Carry every journey with a little more character."
  },
  {
    num: 10,
    slug: "cork-bottle-ocean-mist-combo-18",
    features: [
      { title: "Fresh Visual Identity", description: "Ocean-inspired detailing gives the bottle a calm and contemporary presence." },
      { title: "Natural Cork Accent", description: "Cork introduces an earthy tactile element to the everyday essential." },
      { title: "Everyday Companion", description: "Designed to accompany workdays, travel, and daily routines." },
      { title: "Gift Collection Appeal", description: "Pairs naturally with travel and lifestyle accessories in a curated gift set." }
    ],
    tagline: "Carry refreshment with a naturally distinctive touch."
  },
  {
    num: 11,
    slug: "jet-case-brown-bag-combo-19",
    features: [
      { title: "Earthy Brown Character", description: "A warm brown palette creates a timeless and versatile appearance." },
      { title: "Travel-Inspired Form", description: "Designed around the practical needs of carrying everyday essentials." },
      { title: "Sophisticated Utility", description: "Its restrained styling makes it suitable for both work and travel." },
      { title: "Gift-Worthy Design", description: "A functional accessory that adds substance to premium gifting collections." }
    ],
    tagline: "Travel simply. Carry beautifully."
  },
  {
    num: 12,
    slug: "cork-bottle-granco-combo-19",
    features: [
      { title: "Distinctive Cork Detail", description: "A natural cork element gives the bottle its signature visual identity." },
      { title: "Refined Everyday Form", description: "Designed to bring practical utility into a sophisticated lifestyle collection." },
      { title: "Granco Character", description: "The styling creates a polished addition to curated corporate gifts." },
      { title: "Versatile Appeal", description: "Suitable for workspaces, travel kits, and everyday routines." }
    ],
    tagline: "Everyday refreshment, naturally presented."
  },
  {
    num: 13,
    slug: "passport-holder-granco-combo-19",
    features: [
      { title: "Travel Essential", description: "A compact design created to keep travel documents organised." },
      { title: "Distinctive Texture", description: "Cork detailing adds warmth and personality to the travel accessory." },
      { title: "Refined Styling", description: "The Granco-inspired finish gives it a polished professional character." },
      { title: "Thoughtful Gift Choice", description: "Ideal for travellers, executives, and curated corporate hampers." }
    ],
    tagline: "For journeys that deserve a distinctive beginning."
  },
  {
    num: 14,
    slug: "ecodesk-diary-combo-36",
    features: [
      { title: "Natural Desk Companion", description: "A clean diary format designed for modern workspaces and thoughtful planning." },
      { title: "Warm Material Character", description: "Cork-inspired detailing creates a tactile and natural visual appeal." },
      { title: "Daily Organisation", description: "A practical space for schedules, notes, ideas, and reminders." },
      { title: "Corporate Versatility", description: "Well suited to conferences, employee gifting, and professional stationery sets." }
    ],
    tagline: "Plan the day with a touch of nature."
  },
  {
    num: 15,
    slug: "small-calculator-combo-36",
    features: [
      { title: "Compact Planning", description: "A small-format calendar designed to keep important dates visible." },
      { title: "Desk-Friendly Form", description: "Its compact character fits naturally into professional workspaces." },
      { title: "Natural Accent", description: "Cork detailing adds warmth to a practical desk essential." },
      { title: "Everyday Visibility", description: "A useful accessory that combines organisation with understated style." }
    ],
    tagline: "Make every day count, beautifully."
  },
  {
    num: 16,
    slug: "pen-holder-combo-36",
    features: [
      { title: "Desk Organisation", description: "Keeps everyday writing instruments neatly arranged and accessible." },
      { title: "Natural Texture", description: "Cork brings warmth and tactile character to the desktop." },
      { title: "Compact Presence", description: "Designed to organise without overwhelming the workspace." },
      { title: "Professional Utility", description: "A practical addition to executive desks, offices, and gifting sets." }
    ],
    tagline: "A place for every idea to begin."
  },
  {
    num: 17,
    slug: "mouse-pad-super-fine-grain-combo-36",
    features: [
      { title: "Fine-Grain Character", description: "A subtle cork grain creates a refined and tactile desktop surface." },
      { title: "Modern Workspace Essential", description: "Designed to complement contemporary office and workstation setups." },
      { title: "Natural Visual Appeal", description: "Its earthy material character softens the look of a technology-driven desk." },
      { title: "Functional Sophistication", description: "Balances everyday utility with a crafted, premium appearance." }
    ],
    tagline: "Bring a natural rhythm to the modern desk."
  },
  {
    num: 18,
    slug: "cork-metal-pen-combo-36",
    features: [
      { title: "Cork & Metal Contrast", description: "The meeting of natural texture and polished metal creates visual balance." },
      { title: "Everyday Writing", description: "Designed for notes, meetings, signatures, and daily desk use." },
      { title: "Executive Detail", description: "Its refined proportions make it a natural companion to premium stationery." },
      { title: "Curated Gifting", description: "Complements diaries and desk accessories in professional gift collections." }
    ],
    tagline: "Natural texture. Polished purpose."
  },
  {
    num: 19,
    slug: "natural-tray-9x9-inch-combo-46",
    features: [
      { title: "Natural Serving Form", description: "A clean square silhouette creates an understated presentation surface." },
      { title: "Cork Character", description: "The natural texture adds warmth and visual depth to everyday settings." },
      { title: "Versatile Utility", description: "Useful for organising, presenting, or serving selected essentials." },
      { title: "Minimalist Presence", description: "Its simple form allows the material itself to become the design statement." }
    ],
    tagline: "Simple form, naturally beautiful."
  },
  {
    num: 20,
    slug: "box-uv-printed-coaster-combo-46",
    features: [
      { title: "Printed Detail", description: "UV printing introduces crisp visual detailing to the natural cork surface." },
      { title: "Coordinated Set", description: "Designed as a cohesive coaster collection for stylish presentation." },
      { title: "Practical Protection", description: "Helps create a dedicated surface for placing everyday drinkware." },
      { title: "Gift-Ready Packaging", description: "Presented as a boxed set, making it suitable for corporate gifting." }
    ],
    tagline: "Protect the surface. Elevate the setting."
  },
  {
    num: 21,
    slug: "box-print-table-top-test-tube-holder-combo-46",
    features: [
      { title: "Botanical Display", description: "A compact test-tube format creates an elegant way to display small stems or botanicals." },
      { title: "Cork Foundation", description: "The natural cork base brings warmth and organic character to the design." },
      { title: "Tabletop Scale", description: "Designed to add a subtle decorative element without dominating the desk." },
      { title: "Giftable Craft", description: "A distinctive choice for office desks, homes, and curated gifting." }
    ],
    tagline: "A little greenery can transform a space."
  },
  {
    num: 22,
    slug: "cork-tea-light-holder-assorted-combo-46",
    features: [
      { title: "Warm Illumination", description: "Designed to frame tea lights with a soft, intimate decorative presence." },
      { title: "Natural Cork Texture", description: "The cork surface adds warmth and handcrafted character." },
      { title: "Assorted Personality", description: "Different visual variations make each piece feel distinctive." },
      { title: "Ambient Décor", description: "A charming accent for tables, corners, gifting arrangements, and intimate settings." }
    ],
    tagline: "Let natural texture frame a little light."
  },
  {
    num: 23,
    slug: "round-linear-planter",
    features: [
      { title: "Circular Silhouette", description: "A rounded profile gives the planter a soft and balanced visual presence." },
      { title: "Linear Detailing", description: "Subtle line elements add structure and contemporary character." },
      { title: "Natural Material Appeal", description: "Cork brings an earthy warmth that complements greenery beautifully." },
      { title: "Compact Décor", description: "Designed to introduce a botanical accent to desks, shelves, and tables." }
    ],
    tagline: "Where natural form meets living beauty."
  },
  {
    num: 24,
    slug: "chocochip-square-planter-24",
    features: [
      { title: "Textured Surface", description: "A crocodile-inspired texture gives the planter a distinctive tactile appearance." },
      { title: "Square Geometry", description: "Clean edges create a structured contrast against natural greenery." },
      { title: "Statement Texture", description: "Its surface detail allows the planter itself to become part of the décor." },
      { title: "Contemporary Botanical Accent", description: "A characterful choice for desks, shelves, and modern interiors." }
    ],
    tagline: "Bold texture. Natural expression."
  },
  {
    num: 25,
    slug: "natural-bark-planter",
    features: [
      { title: "Organic Bark Character", description: "A bark-inspired surface celebrates the irregular beauty of natural textures." },
      { title: "Earthy Appearance", description: "Its organic visual language pairs naturally with plants and greenery." },
      { title: "Crafted Imperfection", description: "The texture gives the piece a warm, artisanal personality." },
      { title: "Nature-Inspired Décor", description: "A natural accent for workspaces, homes, and gifting arrangements." }
    ],
    tagline: "Let nature shape the atmosphere."
  },
  {
    num: 26,
    slug: "cork-belly-planter",
    features: [
      { title: "Rounded Character", description: "Its fuller silhouette creates a friendly and expressive decorative presence." },
      { title: "Cork Texture", description: "The natural material adds warmth and visual depth." },
      { title: "Botanical Companion", description: "Designed to frame greenery while remaining visually distinctive on its own." },
      { title: "Versatile Placement", description: "Works beautifully across desks, shelves, side tables, and gifting displays." }
    ],
    tagline: "A softer shape for a greener space."
  },
  {
    num: 27,
    slug: "rectangular-test-tube-planter",
    features: [
      { title: "Structured Form", description: "A rectangular base creates a clean, contemporary foundation." },
      { title: "Test Tube Display", description: "The elevated glass-style format creates an elegant presentation for small stems." },
      { title: "Natural Contrast", description: "Cork and delicate botanical elements create a pleasing balance." },
      { title: "Modern Desk Décor", description: "A compact decorative piece designed for contemporary interiors." }
    ],
    tagline: "A small window into the beauty of nature."
  },
  {
    num: 28,
    slug: "box-print-table-top-tt-planter",
    features: [
      { title: "Tabletop Botanical Form", description: "A compact planter designed to bring greenery into everyday spaces." },
      { title: "Printed Character", description: "Box-print detailing adds visual personality to the natural cork foundation." },
      { title: "Space-Friendly Design", description: "Its tabletop scale makes it easy to incorporate into desks and shelves." },
      { title: "Giftable Décor", description: "A distinctive decorative piece for homes, offices, and curated gifting." }
    ],
    tagline: "Bring a little life to the everyday desk."
  },
  {
    num: 29,
    slug: "feather-printed-tabletop-tt-planter",
    features: [
      { title: "Feather-Inspired Detail", description: "Delicate feather printing adds a graceful decorative element." },
      { title: "Natural Foundation", description: "The cork base creates a warm contrast against the lighter printed motif." },
      { title: "Botanical Presentation", description: "Designed to complement small plants and stems with an artistic touch." },
      { title: "Elegant Desk Accent", description: "A compact decorative piece with a softer, more expressive personality." }
    ],
    tagline: "Delicate details, naturally in bloom."
  },
  {
    num: 30,
    slug: "multi-printed-tabletop-tt-planter",
    features: [
      { title: "Multi-Print Personality", description: "A varied printed surface gives the planter a lively decorative character." },
      { title: "Natural Cork Base", description: "Cork introduces an earthy foundation beneath the expressive detailing." },
      { title: "Compact Botanical Display", description: "Created to bring small-scale greenery into everyday environments." },
      { title: "Playful Sophistication", description: "A decorative accent that adds personality without overwhelming the space." }
    ],
    tagline: "A little colour, a little nature, a lot of character."
  },
  {
    num: 31,
    slug: "cork-conical-flask-planter",
    features: [
      { title: "Flask-Inspired Silhouette", description: "A distinctive conical form gives this planter an unconventional personality." },
      { title: "Cork Craftsmanship", description: "The natural cork surface adds warmth and tactile depth." },
      { title: "Botanical Experimentation", description: "Its laboratory-inspired shape creates an intriguing setting for greenery." },
      { title: "Conversation Piece", description: "Ideal for creative workspaces, modern interiors, and distinctive gifting." }
    ],
    tagline: "Where curiosity grows into design."
  },
  {
    num: 32,
    slug: "wall-frame-test-tube-planter",
    features: [
      { title: "Vertical Botanical Display", description: "Transforms wall space into a compact showcase for greenery." },
      { title: "Framed Composition", description: "The surrounding frame gives the delicate test-tube display a structured presence." },
      { title: "Natural Cork Character", description: "Cork introduces warmth to the otherwise minimal arrangement." },
      { title: "Space-Saving Décor", description: "A creative alternative to conventional tabletop planters." }
    ],
    tagline: "Turn an empty wall into a living detail."
  },
  {
    num: 33,
    slug: "diamond-square-planter",
    features: [
      { title: "Geometric Character", description: "Diamond-inspired detailing gives the square form a distinctive visual rhythm." },
      { title: "Structured Silhouette", description: "Clean geometry creates a modern contrast with organic greenery." },
      { title: "Textured Craftsmanship", description: "The cork surface brings tactile warmth to the design." },
      { title: "Contemporary Botanical Accent", description: "A statement planter for desks, shelves, and modern interiors." }
    ],
    tagline: "Geometry meets the effortless beauty of nature."
  },
  {
    num: 34,
    slug: "chocochip-square-planter-34",
    features: [
      { title: "Chocochip Texture", description: "Speckled detailing creates a playful and distinctive surface character." },
      { title: "Square Form", description: "A structured silhouette keeps the design contemporary and balanced." },
      { title: "Natural Material Appeal", description: "Cork adds warmth and an earthy foundation to the decorative piece." },
      { title: "Cheerful Botanical Accent", description: "A characterful planter for desks, shelves, and gifting collections." }
    ],
    tagline: "A little texture makes nature feel even sweeter."
  },
  {
    num: 35,
    slug: "cork-belly-coaster-set",
    features: [
      { title: "Rounded Character", description: "The belly-inspired shape gives each coaster a softer visual identity." },
      { title: "Natural Cork Surface", description: "Cork brings a warm, tactile quality to the tabletop." },
      { title: "Everyday Table Protection", description: "Designed to provide a dedicated surface for cups and glasses." },
      { title: "Coordinated Set", description: "Four matching pieces create a cohesive tabletop presentation." }
    ],
    tagline: "Small circles of care for every table."
  },
  {
    num: 36,
    slug: "leaf-shape-coaster-set",
    features: [
      { title: "Leaf-Inspired Silhouette", description: "Organic contours bring a botanical character to the tabletop." },
      { title: "Natural Cork Texture", description: "The cork surface reinforces the connection to nature." },
      { title: "Functional Accent", description: "Designed to combine everyday drinkware placement with decorative appeal." },
      { title: "Coordinated Collection", description: "A set of four creates a harmonious visual arrangement." }
    ],
    tagline: "A touch of nature beneath every moment."
  },
  {
    num: 37,
    slug: "box-uv-printed-coaster-set",
    features: [
      { title: "Crisp UV Printing", description: "Printed details add definition and personality to the cork surface." },
      { title: "Coordinated Design", description: "A four-piece set creates a polished and consistent tabletop look." },
      { title: "Practical Everyday Use", description: "Designed as a dedicated base for cups and glasses." },
      { title: "Presentation-Ready", description: "Boxed presentation makes the set particularly suitable for gifting." }
    ],
    tagline: "Designed to protect. Crafted to impress."
  },
  {
    num: 38,
    slug: "cork-fine-natural-trivet-set",
    features: [
      { title: "Fine Natural Grain", description: "The refined cork grain becomes the central visual feature of the design." },
      { title: "Tabletop Utility", description: "Created to provide a practical base for cookware and serving vessels." },
      { title: "Organic Simplicity", description: "Its natural appearance complements both contemporary and traditional settings." },
      { title: "Pair of Essentials", description: "Two coordinated pieces offer flexible everyday use." }
    ],
    tagline: "Natural texture, made for the heart of the home."
  },
  {
    num: 39,
    slug: "chocochip-trivet-set",
    features: [
      { title: "Speckled Character", description: "Chocochip-inspired detailing creates a warm and playful visual texture." },
      { title: "Functional Form", description: "Designed to provide a dedicated surface for hot cookware and serving pieces." },
      { title: "Natural Warmth", description: "The cork foundation brings an earthy quality to the tabletop." },
      { title: "Coordinated Pair", description: "Two matching trivets make practical and visually balanced companions." }
    ],
    tagline: "Warm textures for warm gatherings."
  },
  {
    num: 40,
    slug: "red-assiago-trivet-set",
    features: [
      { title: "Red Asiago Character", description: "A rich red-inspired pattern brings energy and visual depth to the table." },
      { title: "Natural Cork Foundation", description: "The cork base balances the stronger decorative character." },
      { title: "Practical Tabletop Design", description: "Created as a useful base for serving dishes and cookware." },
      { title: "Coordinated Pair", description: "Two pieces work together to create a composed tabletop setting." }
    ],
    tagline: "A bold accent for beautifully shared moments."
  },
  {
    num: 41,
    slug: "striped-trivet-set",
    features: [
      { title: "Linear Pattern", description: "Striped detailing introduces rhythm and structure to the natural surface." },
      { title: "Contemporary Character", description: "The clean pattern works naturally with modern table settings." },
      { title: "Everyday Utility", description: "Designed to create a practical surface between cookware and the tabletop." },
      { title: "Balanced Pairing", description: "The two-piece format offers both utility and visual consistency." }
    ],
    tagline: "Simple lines, thoughtfully placed."
  },
  {
    num: 42,
    slug: "web-printed-trivet",
    features: [
      { title: "Web-Inspired Pattern", description: "Intricate web detailing creates an expressive visual focal point." },
      { title: "Textured Cork Base", description: "The natural cork foundation adds warmth beneath the printed artwork." },
      { title: "Functional Protection", description: "Designed to serve as a practical base for cookware and serving pieces." },
      { title: "Decorative Utility", description: "Combines tabletop function with an artistic graphic character." }
    ],
    tagline: "Where pattern meets everyday purpose."
  },
  {
    num: 43,
    slug: "smoky-black-small-round-tray",
    features: [
      { title: "Smoky Black Finish", description: "A deep dark tone gives the tray a sophisticated and contemporary presence." },
      { title: "Rounded Silhouette", description: "The circular form creates a soft visual balance." },
      { title: "Compact Utility", description: "Ideal for organising small essentials or presenting selected items." },
      { title: "Modern Statement", description: "Its restrained colour and natural material create understated elegance." }
    ],
    tagline: "Dark, refined, and effortlessly composed."
  },
  {
    num: 44,
    slug: "cork-tablemat-chocochip-18-inch",
    features: [
      { title: "Chocochip Texture", description: "Speckled detailing gives the tablemat a warm and distinctive personality." },
      { title: "Natural Cork Surface", description: "The tactile material adds an earthy layer to the dining setting." },
      { title: "Practical Tabletop Layer", description: "Designed to create a defined surface beneath plates and serving pieces." },
      { title: "Everyday Style", description: "Combines functional purpose with a relaxed, natural aesthetic." }
    ],
    tagline: "A little texture beneath every shared meal."
  },
  {
    num: 45,
    slug: "cork-tablemat-red-assiago-18-inch",
    features: [
      { title: "Red Asiago Pattern", description: "A rich patterned finish creates a lively focal point on the table." },
      { title: "Cork Craftsmanship", description: "The natural base brings warmth and tactile depth." },
      { title: "Defined Dining Space", description: "Creates a dedicated surface for plates and table settings." },
      { title: "Expressive Tabletop Accent", description: "A practical piece that adds colour and character to everyday dining." }
    ],
    tagline: "Bring a little boldness to the table."
  },
  {
    num: 46,
    slug: "cork-tablemat-abstract-18-inch",
    features: [
      { title: "Abstract Expression", description: "Artistic patterning gives the tablemat a contemporary visual identity." },
      { title: "Natural Cork Texture", description: "The organic material adds warmth beneath the expressive design." },
      { title: "Functional Composition", description: "Designed to define and organise an individual dining space." },
      { title: "Modern Table Styling", description: "A versatile accent for contemporary homes and curated dining settings." }
    ],
    tagline: "Where everyday dining becomes a canvas."
  },
  {
    num: 47,
    slug: "cork-tablemat-oval-red-assiago",
    features: [
      { title: "Oval Silhouette", description: "The elongated shape introduces a softer, more organic visual flow." },
      { title: "Red Asiago Detail", description: "Rich patterned detailing gives the piece a confident decorative presence." },
      { title: "Natural Cork Foundation", description: "Cork adds warmth and tactile character beneath the design." },
      { title: "Elegant Tabletop Accent", description: "Balances everyday functionality with expressive styling." }
    ],
    tagline: "A graceful shape for beautifully set tables."
  },
  {
    num: 48,
    slug: "chocochip-napkin-ring",
    features: [
      { title: "Speckled Character", description: "Chocochip-inspired detailing gives the napkin ring a warm decorative personality." },
      { title: "Natural Cork Texture", description: "The cork surface brings an organic touch to the table setting." },
      { title: "Refined Table Detail", description: "A small accessory designed to make the overall dining arrangement feel considered." },
      { title: "Coordinated Styling", description: "Pairs naturally with earthy, contemporary, and relaxed table settings." }
    ],
    tagline: "Beautiful tables live in the details."
  },
  {
    num: 49,
    slug: "round-napkin-ring",
    features: [
      { title: "Classic Circular Form", description: "A timeless round silhouette keeps the design clean and versatile." },
      { title: "Natural Material Character", description: "Cork adds warmth and tactile appeal to the simple form." },
      { title: "Tabletop Refinement", description: "Designed to neatly frame folded napkins and complete a place setting." },
      { title: "Minimalist Elegance", description: "Its understated design complements a wide range of dining aesthetics." }
    ],
    tagline: "Sometimes the smallest details complete the table."
  },
  {
    num: 50,
    slug: "fine-grain-napkin-ring",
    features: [
      { title: "Fine-Grain Finish", description: "A subtle cork grain gives the napkin ring a refined natural appearance." },
      { title: "Clean Circular Form", description: "The simple silhouette keeps the focus on material and craftsmanship." },
      { title: "Elegant Table Detail", description: "Designed to bring a polished finishing touch to individual place settings." },
      { title: "Natural Sophistication", description: "Its understated character makes it easy to pair with different table styles." }
    ],
    tagline: "Refinement begins with the smallest detail."
  }
];

console.log("=== UPDATING CORK PRODUCT DESCRIPTIONS ACROSS SEED, DB, & JSON ===");

let updatedCount = 0;
let skippedCount = 0;
const unmatchedSlugs = [];

// 1. Update vinsho-commerce-seed.json
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

corkDescriptions.forEach(item => {
  const seedProdIdx = seedData.products.findIndex(p => p.slug === item.slug);
  const mainDesc = item.features.map(f => f.description).join(' ');

  if (seedProdIdx > -1) {
    seedData.products[seedProdIdx].features = item.features;
    seedData.products[seedProdIdx].closing_line = item.tagline;
    seedData.products[seedProdIdx].closingLine = item.tagline;
    seedData.products[seedProdIdx].highlightsTagline = item.tagline;
    seedData.products[seedProdIdx].description = mainDesc;
    seedData.products[seedProdIdx].tagline = item.tagline;
  } else {
    unmatchedSlugs.push(item.slug);
  }
});

fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
console.log(`✓ Updated vinsho-commerce-seed.json`);

// 2. Update SQLite Database
const db = new Database(dbPath);

const updateStmt = db.prepare(`
  UPDATE products
  SET features = ?, closing_line = ?, description = ?, tagline = ?, updated_at = datetime('now')
  WHERE slug = ?
`);

db.transaction(() => {
  corkDescriptions.forEach(item => {
    const mainDesc = item.features.map(f => f.description).join(' ');
    const featuresJson = JSON.stringify(item.features);
    const res = updateStmt.run(featuresJson, item.tagline, mainDesc, item.tagline, item.slug);
    if (res.changes > 0) {
      updatedCount++;
    } else {
      skippedCount++;
    }
  });
})();

console.log(`✓ Updated SQLite Database (Updated: ${updatedCount}, Skipped: ${skippedCount})`);

if (unmatchedSlugs.length > 0) {
  console.warn("Unmatched Slugs:", unmatchedSlugs);
} else {
  console.log("✓ All 50 products matched exactly by slug!");
}
