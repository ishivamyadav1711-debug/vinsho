import fs from 'fs';
import Database from 'better-sqlite3';

// Map of content bank categories to product slugs and details
const contentBank = [
  {
    matchSlugs: ['aprons'],
    tagline: "Cook in style. Live in comfort.",
    description: "Designed for everyday moments with premium quality fabric that protects, performs and looks beautiful.",
    features: [
      { title: "Durable & Washable", description: "Made from high-quality fabric for long-lasting use." },
      { title: "Protective & Practical", description: "Shields your clothes from spills and stains with ease." },
      { title: "Perfect for Any Occasion", description: "Ideal for home chefs, bakers and professionals alike." },
      { title: "Stylish & Functional", description: "Thoughtfully designed for comfort and everyday use." }
    ],
    closingLine: "Crafted to elevate every moment."
  },
  {
    matchSlugs: ['artificial-flowers', 'bonsai-jade-plant'],
    tagline: "Timeless beauty for every corner.",
    description: "Realistic in texture and color, our artificial flowers stay fresh-looking all year round. Perfect for vases, centerpieces, or wall décor, they bring vibrancy and charm without the need for maintenance.",
    features: [
      { title: "Realistic Look", description: "Natural texture and vibrant colors for a lifelike feel." },
      { title: "Long Lasting", description: "Stays fresh and beautiful all year round without wilting or fading." },
      { title: "Perfect Decor", description: "Ideal for vases, centerpieces, shelves or wall accents." },
      { title: "Maintenance Free", description: "No watering or special care required. Just lasting beauty." }
    ],
    closingLine: "Decor that stays. Beauty that lasts."
  },
  {
    matchSlugs: ['bathmats'],
    tagline: "Softer steps. Better mornings.",
    description: "Ultra-soft, quick-dry bathmats that keep your bathroom fresh, clean and beautifully comfortable.",
    features: [
      { title: "Ultra Soft & Absorbent", description: "Plush texture that feels gentle underfoot and absorbs water in seconds." },
      { title: "Non-Slip Backing", description: "Secure grip design keeps the mat firmly in place for safety." },
      { title: "Quick Drying", description: "Dries fast to keep your bathroom fresh, clean and odour-free." },
      { title: "Easy to Clean", description: "Machine washable and built to stay soft and durable after every wash." }
    ],
    closingLine: "Crafted to elevate every moment."
  },
  {
    matchSlugs: ['bedcover'],
    tagline: "Wrap your bed. Wake up refreshed.",
    description: "Add a touch of elegance to your bedroom with our premium bedcover — soft, breathable and beautifully designed for everyday luxury.",
    features: [
      { title: "Premium Comfort", description: "Crafted from ultra-soft, breathable fabric for a cozy and relaxing sleep." },
      { title: "Elegant Design", description: "Timeless patterns and soothing tones to elevate your bedroom decor." },
      { title: "Durable & Easy Care", description: "High-quality fabric that stays soft, vibrant and easy to maintain." },
      { title: "Perfect Fit", description: "Designed to drape beautifully and stay in place all night." }
    ],
    closingLine: "Crafted to inspire every idea."
  },
  {
    matchSlugs: ['bedsheet'],
    tagline: "Transform your bedroom into a cozy retreat with our Cotton Bedsheets.",
    description: "Made from 100% high quality cotton for superior softness and durability, keeping your bedroom comfortable and stylish.",
    features: [
      { title: "Cotton", description: "Made from 100% high quality cotton for superior softness and durability." },
      { title: "Soft & Comfortable", description: "Smooth, gentle touch for a relaxing and cozy sleep." },
      { title: "Breathable Fabric", description: "Keeps you cool and comfortable all night long." },
      { title: "Elegant Design", description: "Stylish prints that add charm and elegance to your bedroom." }
    ],
    closingLine: "Crafted to elevate every bedroom."
  },
  {
    matchSlugs: ['blanket'],
    tagline: "Wrap yourself in warmth.",
    description: "Our Ultra-Soft Blanket is crafted from premium insulating fabric that keeps you snug through all seasons. Its luxurious texture and elegant weave make it as beautiful as it is comforting.",
    features: [
      { title: "Ultra-Soft & Warm", description: "Premium insulating fabric that provides exceptional warmth and a gentle touch." },
      { title: "Lightweight & Cozy", description: "Designed to be lightweight yet warm, perfect for year-round comfort." },
      { title: "Elegant Weave", description: "Luxurious texture and refined design that adds beauty to your bedroom." },
      { title: "Durable & Long Lasting", description: "High-quality fabric that stays soft, keeps its shape and lasts through countless uses." }
    ],
    closingLine: "Crafted to inspire every idea."
  },
  {
    matchSlugs: ['blinds', 'blinds-with-decor'],
    tagline: "Style. Privacy. Serenity.",
    description: "Blinds with decorative accents bring style and functionality together for your interiors. Designed to control light and privacy, these blinds enhance any room with a modern and elegant touch.",
    features: [
      { title: "Botanical Beauty", description: "Soothing green leaf prints inspired by nature." },
      { title: "Privacy & Comfort", description: "Enjoy natural light while keeping your space private." },
      { title: "Light Filtering", description: "Softly filters sunlight for a warm, cozy glow." },
      { title: "Premium Quality", description: "High-quality fabric for durability and style." }
    ],
    closingLine: "Beautiful Windows. Better Living."
  },
  {
    matchSlugs: ['botanical-printed-blinds'],
    tagline: "Bring nature home. Every single day.",
    description: "Featuring lush green leaf prints and soft neutral tones, these blinds add a calming touch to any space while ensuring your privacy.",
    features: [
      { title: "Botanical Beauty", description: "Soothing green leaf prints inspired by nature." },
      { title: "Privacy & Comfort", description: "Enjoy natural light while keeping your space private." },
      { title: "Light Filtering", description: "Softly filters sunlight for a warm, cozy glow." },
      { title: "Premium Quality", description: "High-quality fabric for durability and style." }
    ],
    closingLine: "Nature-Inspired. Beautifully Designed."
  },
  {
    matchSlugs: ['buddha'],
    tagline: "Grace in stillness. Strength in silence.",
    description: "A symbol of peace, balance, and mindfulness, carefully hand-finished to bring tranquil harmony and positive energy into your living space.",
    features: [
      { title: "Calm That Lasts", description: "A symbol of peace that brings balance to life." },
      { title: "Artistry in Every Detail", description: "Thoughtfully crafted to reflect beauty, depth, and meaning." },
      { title: "Elevate Any Space", description: "Perfect for homes, offices, or your quiet corner." },
      { title: "Beyond Decor", description: "A daily reminder to pause, breathe, and be present." }
    ],
    closingLine: "Bring peace home. Let your space inspire you."
  },
  {
    matchSlugs: ['candle-holders'],
    tagline: "Warmth that glows. Elegance that stays.",
    description: "Add a touch of sophistication to your space with our beautifully crafted candle holders. Designed to elevate any setting with their timeless charm and soothing glow.",
    features: [
      { title: "Elegant Design", description: "A perfect blend of gold finish and rich accents for a luxury look." },
      { title: "Soothing Ambiance", description: "The soft glow creates a warm, calming atmosphere." },
      { title: "Premium Quality", description: "Crafted with high-quality materials for durability and lasting beauty." },
      { title: "Perfect for Any Space", description: "Ideal for living rooms, dining tables, bedrooms or special occasions." }
    ],
    closingLine: "Light up your space. Elevate every moment."
  },
  {
    matchSlugs: ['carpets'],
    tagline: "Bring warmth and sophistication to your space.",
    description: "Bring warmth and sophistication to your space with this stunning handcrafted carpet from Vinsho. Made with premium materials and meticulous attention to detail, it offers durability and comfort underfoot.",
    features: [
      { title: "Premium Quality", description: "Crafted from high-quality materials for a soft and luxurious feel." },
      { title: "Durable & Comfortable", description: "Built to last while providing superior comfort underfoot." },
      { title: "Stylish Design", description: "A tasteful design that adds charm and elegance to any living space." },
      { title: "Perfect for Any Space", description: "Ideal for your living room, bedroom, or any corner that needs warmth and character." }
    ],
    closingLine: "Crafted to inspire every idea."
  },
  {
    matchSlugs: ['comforter-set'],
    tagline: "Soft Touch. Complete Comfort.",
    description: "Experience plush warmth and complete sleeping comfort with our ultra-soft comforter set, designed with subtle tones to complement any bedroom décor.",
    features: [
      { title: "Ultra Soft", description: "Plush comfort you can feel." },
      { title: "Fabric", description: "Breathable, durable & skin-friendly." },
      { title: "Perfect Fit", description: "Designed to elevate every bedroom." },
      { title: "Timeless Style", description: "Subtle tones that suit every space." }
    ],
    closingLine: "Crafted for comfort. Designed for you."
  },
  {
    matchSlugs: ['crystal-candle-holders'],
    tagline: "Elegance that shines. Ambiance that soothes.",
    description: "Beautifully crafted with a golden finish and sparkling crystal accents, these candle holders add a touch of luxury and warmth to any space. Perfect for décor, celebrations, or thoughtful gifting.",
    features: [
      { title: "Stunning Design", description: "Golden finish with sparkling crystals for a luxurious look." },
      { title: "Warm & Soothing Glow", description: "Creates a calm and cozy ambiance for every moment." },
      { title: "Premium Quality", description: "Crafted with high-quality metal and crystal for lasting beauty." },
      { title: "Perfect for Any Occasion", description: "Ideal for home décor, dining tables, festivals, and special celebrations." }
    ],
    closingLine: "Light up your space. Elevate every moment."
  },
  {
    matchSlugs: ['curtains'],
    tagline: "Add grace and warmth to your home.",
    description: "Crafted from fine fabric with a smooth finish and designed to complement any décor, our curtains bring sophistication and comfort to your living space.",
    features: [
      { title: "Finest Fabric", description: "Made from high-quality fabric for a soft, smooth and luxurious feel." },
      { title: "Elegant Design", description: "Timeless patterns and shades that enhance any interior." },
      { title: "Perfect Fit", description: "Tailored to suit every window beautifully and effortlessly." },
      { title: "Privacy & Light Control", description: "Enjoy the perfect balance of natural light and privacy." }
    ],
    closingLine: "Crafted to inspire every idea."
  },
  {
    matchSlugs: ['cushions'],
    tagline: "Comfort in Every Hug.",
    description: "Plush and inviting cushions crafted from ultra-soft fabrics with adorable, charming styles that bring warmth and joy to every room.",
    features: [
      { title: "Plush & Soft", description: "Made from ultra-soft fabric for maximum comfort." },
      { title: "Adorable Designs", description: "Cute and charming styles kids and adults will love." },
      { title: "Perfect for Any Space", description: "Adds warmth and joy to bedrooms, living rooms, or play areas." }
    ],
    closingLine: "Crafted to elevate every space."
  },
  {
    matchSlugs: ['customised-wall-paper', 'customised-wall-paper-floral-design'],
    tagline: "Elevate Your Living Space With This Stylish Wallpaper.",
    description: "Featuring a calming botanical backdrop, this customised wall paper brings warmth and charm to your interiors. Designed with soft upholstery, earthy cushions, and natural wooden accents, it blends comfort with modern elegance — perfect for cozy, contemporary homes seeking a fresh, nature-inspired interior look.",
    features: [
      { title: "Botanical Beauty", description: "Calming, nature-inspired visuals for a fresh interior aesthetic." },
      { title: "Soft & Elegant Finish", description: "Smooth texture that adds warmth, depth and balance to your interiors." },
      { title: "Personalised Design", description: "Customised dimensions crafted to suit your space perfectly." },
      { title: "Modern Elegance", description: "Blends seamlessly with earthy cushions and natural wooden accents." }
    ],
    closingLine: "Bring nature's beauty into your everyday space."
  },
  {
    matchSlugs: ['customised-wall-paper-buddha-design'],
    tagline: "Elevate your space. Embrace tranquility.",
    description: "Bring serene harmony into your home with our Zen & Buddha themed wallpaper, featuring rich, lasting prints that transform living areas and quiet sanctuaries.",
    features: [
      { title: "Rich & Lasting Print", description: "High quality print that brings vibrant colors and fine details to life." },
      { title: "Soft & Elegant Finish", description: "Smooth texture that adds warmth, depth and balance to your interiors." },
      { title: "Made Just for You", description: "Personalised designs and sizes crafted to suit your space perfectly." },
      { title: "Ideal for Every Room", description: "Perfect for living room, pooja room, bedroom, office and more." }
    ],
    closingLine: "Timeless beauty. Made for your home."
  },
  {
    matchSlugs: ['candles', 'black-beauty-candle', '3-shade-flower-jar-candle', '3-rose-candle-bouquet'],
    tagline: "Enrich Your Home's Ambiance With Our Exclusive Décor Candles.",
    description: "Enrich your home's ambiance with our Exclusive Décor Collection. Each piece is designed to infuse warmth, character, and beauty into your space. From elegant accents to artistic creations, our décor range helps you express your unique style effortlessly.",
    features: [
      { title: "Exclusive Ambiance", description: "Infuses warmth, character, and soothing illumination into any setting." },
      { title: "Artistic Creation", description: "Beautifully hand-finished candle vessels that serve as standalone décor." },
      { title: "Clean & Pure Burn", description: "Poured wax formulation designed for a long-lasting, fragrant throw." },
      { title: "Express Your Style", description: "Complements modern, minimalist, and luxury interior themes." }
    ],
    closingLine: "Warmth that glows, beauty that stays."
  },
  {
    matchSlugs: ['diaries', 'corporate-gifting'],
    tagline: "Capture Your Thoughts Beautifully With Our Elegant Diaries.",
    description: "Featuring smooth, high-quality paper and a durable cover, these diaries are perfect for daily journaling or professional note-taking. Available in modern and classic designs that make wonderful gifts for students, professionals, and loved ones.",
    features: [
      { title: "Premium Quality", description: "Smooth, high-quality paper for a superior writing experience every time." },
      { title: "Durable & Stylish", description: "Sturdy cover designed to protect your notes and keep them safe." },
      { title: "Perfect for Everyday", description: "Ideal for journaling, planning, note-taking or gifting on any occasion." }
    ],
    closingLine: "Thoughts today, memories forever."
  },
  {
    matchSlugs: ['doormat', 'elegant-doormat'],
    tagline: "Welcome Guests in Style With This Elegant Doormat.",
    description: "Crafted from durable, weather-resistant material, this doormat features an attractive stone-inspired design with ornate detailing and a bold 'Welcome' message. Ideal for home entrances, it helps trap dirt and dust while adding charm, warmth, and a classy first impression to your doorway.",
    features: [
      { title: "Durable & Weather-Resistant", description: "Made from premium quality material designed to last in all conditions." },
      { title: "Attractive Stone-Inspired Design", description: "Ornate detailing with a bold Welcome message for a warm, inviting look." },
      { title: "Keeps Entrance Clean & Welcoming", description: "Helps trap dirt and dust while enhancing the beauty of your entryway." }
    ],
    closingLine: "A perfect blend of function and timeless style."
  },
  {
    matchSlugs: ['floral-panels'],
    tagline: "Bring Nature, Beauty & Life to Your Walls.",
    description: "A stunning blend of lush greenery and vibrant blooms that adds freshness, elegance and positivity to any space.",
    features: [
      { title: "Natural Beauty", description: "Realistic foliage and flowers that elevate your décor." },
      { title: "Durable & Long Lasting", description: "Made with premium quality materials for a lasting impression." },
      { title: "Perfect for Any Space", description: "Ideal for homes, offices, cafés, balconies and more." },
      { title: "Easy to Maintain", description: "No watering, no sunlight. Just beauty all year round." }
    ],
    closingLine: "Transform your walls into a breathtaking natural escape."
  },
  {
    matchSlugs: ['flowers-bouquet'],
    tagline: "Fresh Blooms. Timeless Beauty.",
    description: "Handpicked floral arrangements crafted to bring sophisticated charm and enduring natural beauty into your living space.",
    features: [
      { title: "Natural Elegance", description: "Handpicked blooms for a fresh and sophisticated look." },
      { title: "Artfully Arranged", description: "Carefully crafted to create harmony and charm." },
      { title: "Long Lasting Beauty", description: "Made to stay fresh and uplift your space." },
      { title: "Perfect for Every Occasion", description: "Ideal for gifting, décor & special moments." }
    ],
    closingLine: "Crafted to elevate every space."
  },
  {
    matchSlugs: ['flower-vases'],
    tagline: "A perfect blend of elegance and charm.",
    description: "A perfect blend of elegance and charm to accentuate every space beautifully.",
    features: [
      { title: "Artistic Appeal", description: "Unique designs that bring artistic charm to your décor." },
      { title: "Timeless Finish", description: "High quality finish for a sleek and lasting appeal." },
      { title: "Perfect Accent", description: "Ideal for tables, shelves and console spaces." },
      { title: "Made to Elevate", description: "Designed to complement modern interiors beautifully." }
    ],
    closingLine: "Crafted to elevate every space."
  },
  {
    matchSlugs: ['fountains'],
    tagline: "Flow of Peace, Flow of Prosperity.",
    description: "Introduce the soothing rhythm of flowing water into your home or workplace with our elegant water fountains, designed to foster peace and positive energy.",
    features: [
      { title: "Attracts Positive Energy", description: "Brings positivity and creates a peaceful atmosphere." },
      { title: "Enhances Calm & Harmony", description: "The sound of flowing water reduces stress and soothes the mind." },
      { title: "Perfect for Home & Office", description: "Adds a touch of elegance and serenity to any space." },
      { title: "Perfect for Gifting", description: "A thoughtful gift that spreads peace and good wishes." }
    ],
    closingLine: "Crafted to elevate every space."
  },
  {
    matchSlugs: ['fridge-cover', 'fridge-covers'],
    tagline: "Protect. Style. Simplify.",
    description: "Keep your refrigerator clean, scratch-free, and organized with our stylish fabric covers, featuring convenient side storage pockets.",
    features: [
      { title: "Dust & Stain Protection", description: "Shields your fridge from dust, spills and scratches." },
      { title: "Quality Fabric", description: "Made from durable, washable & long-lasting material." },
      { title: "Convenient Pockets", description: "Extra storage for notes, bills, pens & more." },
      { title: "Stylish Design", description: "Beautiful prints to enhance your kitchen décor." }
    ],
    closingLine: "Style that protects."
  },
  {
    matchSlugs: ['jaguar', 'jaguar-showpiece', 'jaguar-new-arrival-teaser'],
    tagline: "Bold Design. Timeless Charm.",
    description: "A striking symbol of power, grace, and sophistication crafted to elevate your space.",
    features: [
      { title: "Striking Appeal", description: "Command attention with its bold presence." },
      { title: "Premium Finish", description: "Sleek black finish with gold polka detailing." },
      { title: "Artistic Excellence", description: "Beautifully crafted to reflect elegance." },
      { title: "Perfect for Any Space", description: "Ideal for living rooms, offices, and luxury interiors." }
    ],
    closingLine: "Crafted to elevate every wall."
  },
  {
    matchSlugs: ['jute-placemat'],
    tagline: "Add a natural, earthy touch to your dining space.",
    description: "Add a natural, earthy touch to your dining space with this handcrafted jute placemat set. Made from durable, eco-friendly jute fibers, it features a subtle woven pattern with elegant fringed edges.",
    features: [
      { title: "Natural & Eco-Friendly", description: "Made from sustainable jute fibers, safe for you and the environment." },
      { title: "Handcrafted Quality", description: "Expertly woven by skilled artisans for a unique and premium finish." },
      { title: "Durable & Long Lasting", description: "Strong and sturdy construction designed for everyday use." },
      { title: "Elegant Fringed Edges", description: "Subtle fringe detailing adds charm and enhances your table décor." }
    ],
    closingLine: "Crafted to inspire every idea."
  },
  {
    matchSlugs: ['ceramic-storage-jars-set', 'kitchen-ware'],
    tagline: "Vintage Charm. Modern Organization.",
    description: "Crafted from high-quality ceramic with a smooth pastel finish and rustic typography, these airtight storage jars blend vintage kitchen elegance with modern utility.",
    features: [
      { title: "Premium Ceramic", description: "Crafted from high-quality ceramic with a smooth pastel finish for lasting durability." },
      { title: "Airtight Lids", description: "Keeps tea, coffee, sugar, and other essentials fresh for longer." },
      { title: "Vintage Design", description: "Rustic typography and timeless craftsmanship add elegance to every kitchen." },
      { title: "Functional & Stylish", description: "Perfect for everyday storage while enhancing your countertop décor." }
    ],
    closingLine: "Vintage Charm. Modern Organization."
  },
  {
    matchSlugs: ['laughing-buddha', 'laughing-buddha-statue'],
    tagline: "Happiness, Abundance & Good Fortune.",
    description: "Welcome positivity every day. The Laughing Buddha is a timeless symbol of joy, prosperity and positive energy.",
    features: [
      { title: "Happiness", description: "Brings joy, laughter and positive vibes." },
      { title: "Prosperity", description: "Attracts wealth, success and financial growth." },
      { title: "Abundance", description: "Invites endless opportunities and good fortune." },
      { title: "Positive Energy", description: "Dispels negativity and creates a harmonious space." }
    ],
    closingLine: "Crafted to inspire beautiful spaces."
  },
  {
    matchSlugs: ['leafy-hangings'],
    tagline: "Nature. Light. Timeless Ambiance.",
    description: "Handcrafted rattan woven pendant lights paired with cascading green foliage, bringing natural warmth and earthy charm into modern living areas.",
    features: [
      { title: "Woven Pendant Lights", description: "Handcrafted woven shades that diffuse warm light and create a cozy atmosphere." },
      { title: "Cascading Greenery", description: "Lush, lifelike green leaves that add freshness and bring nature indoors." },
      { title: "Natural Textures", description: "A perfect blend of rattan and greenery for an earthy, organic charm." },
      { title: "Versatile Decor", description: "Ideal for cafés, restaurants, living spaces, balconies, and more." }
    ],
    closingLine: "Nature. Light. Timeless Ambiance."
  },
  {
    matchSlugs: ['mattress', 'mattresses'],
    tagline: "Better Sleep. Better Life.",
    description: "Engineered with orthopedic support and plush breathable comfort layers for deep, restful, spine-aligning sleep night after night.",
    features: [
      { title: "Orthopedic Support", description: "Promotes proper spine alignment and relieves pressure points." },
      { title: "Premium Comfort", description: "Soft, breathable layers for ultimate relaxation." },
      { title: "Durable & Reliable", description: "Made with high-quality materials that last for years." },
      { title: "Restful Sleep", description: "Designed to help you sleep deeper, longer and wake up refreshed." }
    ],
    closingLine: "Crafted for your comfort."
  },
  {
    matchSlugs: ['metal-tree'],
    tagline: "Elegance Crafted in Every Detail",
    description: "This exquisite metal tree sculpture adds a touch of elegance and artistry to any space. Crafted from durable metal with intricate detailing, it serves as a perfect decorative piece for homes or offices.",
    features: [
      { title: "Exquisite Craftsmanship", description: "Intricate detailing that reflects fine artistry and precision." },
      { title: "Durable & Premium Quality", description: "Made from high-quality metal for long-lasting beauty." },
      { title: "Versatile Decor Piece", description: "Perfect for tabletops, shelves, mantels, or office spaces." },
      { title: "Timeless Appeal", description: "A symbol of strength and growth that complements any interior." }
    ],
    closingLine: "Crafted to elevate every space."
  },
  {
    matchSlugs: ['placemats-napkins', 'napkin-set'],
    tagline: "Dine Beautifully. Live Elegantly.",
    description: "Protect and elevate your dining table with our premium stain-resistant placemat and napkin sets, featuring vibrant patterns for everyday meals and special gatherings.",
    features: [
      { title: "Premium Quality", description: "Crafted from high-quality, durable fabric." },
      { title: "Easy to Clean", description: "Stain-resistant & easy to maintain." },
      { title: "Stylish Designs", description: "Vibrant patterns that elevate your table." },
      { title: "Protect & Decorate", description: "Protect your table while adding a decorative touch." }
    ],
    closingLine: "Beautiful Tables. Memorable Moments."
  },
  {
    matchSlugs: ['pens'],
    tagline: "Write with style. Inspire every word.",
    description: "A perfect blend of elegance and performance, crafted for those who value quality in every detail.",
    features: [
      { title: "Sleek & Stylish", description: "Modern design with a premium metallic finish." },
      { title: "Perfect for Gifting", description: "Comes in a sophisticated gift box for every occasion." },
      { title: "Comfortable Grip", description: "Designed for smooth writing and all-day comfort." },
      { title: "Premium Quality", description: "Crafted from high-quality materials for lasting use." }
    ],
    closingLine: "Crafted to inspire every idea."
  },
  {
    matchSlugs: ['photo-frame', 'photo-frames'],
    tagline: "Preserve your most treasured memories with timeless elegance.",
    description: "Preserve your most treasured memories with timeless elegance. Crafted with quality materials and refined finishes, these photo frames add warmth, style, and sophistication to every space. Perfect for your home, office, or as a heartfelt gift.",
    features: [
      { title: "Quality", description: "Made with durable materials and fine finishes." },
      { title: "Elegant Designs", description: "Minimal, modern, and made to suit every style and space." },
      { title: "Perfect for Gifting", description: "A thoughtful gift for birthdays, anniversaries, and special occasions." },
      { title: "Enhances Any Space", description: "Adds warmth and personality to your home or office." }
    ],
    closingLine: "Make every wall a masterpiece."
  },
  {
    matchSlugs: ['pillows'],
    tagline: "Softness You Feel. Comfort You Deserve.",
    description: "Ultra-soft, breathable pillows engineered to deliver ergonomic support and fresh temperature regulation for all sleeping positions.",
    features: [
      { title: "Ultra-Soft Fill", description: "For a cozy, relaxing sleep." },
      { title: "Breathable & Fresh", description: "Airy design keeps you cool through the night." },
      { title: "Durable & Long Lasting", description: "Made with high-quality materials for everyday use." },
      { title: "Perfect for Every Sleeper", description: "Ideal for all sleeping positions and preferences." }
    ],
    closingLine: "Crafted for comfort, designed for you."
  },
  {
    matchSlugs: ['round-placemat'],
    tagline: "Elegance Crafted for Every Dining Table",
    description: "Protect your dining table from heat and spills while adding floral and fruit-inspired sophistication with scalloped decorative edges.",
    features: [
      { title: "Durable & Protective", description: "Shields your table from heat, spills & scratches." },
      { title: "Easy to Clean", description: "Wipe clean effortlessly for everyday use." },
      { title: "Elegant Design", description: "Beautiful floral & fruit-inspired print with scalloped edges." },
      { title: "Perfect for Any Occasion", description: "Ideal for daily meals or special gatherings." }
    ],
    closingLine: "Crafted to elevate every table."
  },
  {
    matchSlugs: ['anti-skid-rubber-mat'],
    tagline: "Safety You Can Feel. Comfort You Can Trust.",
    description: "Designed to prevent slips and falls, this durable rubber mat provides excellent grip and long-lasting performance in any space.",
    features: [
      { title: "Anti Skid Surface", description: "Superior grip for maximum safety." },
      { title: "Durable & Long Lasting", description: "Made from high-quality rubber for extended use." },
      { title: "Easy to Clean", description: "Water-resistant and low maintenance." },
      { title: "Perfect for Every Space", description: "Ideal for bathrooms, kitchens, entryways & more." }
    ],
    closingLine: "Crafted for safety. Made for every home."
  },
  {
    matchSlugs: ['runners', 'elegant-runners'],
    tagline: "Refined Look. Every Step.",
    description: "Add warmth, texture, and refined elegance beside your bed or along hallways with our plush, floor-protecting carpet runners.",
    features: [
      { title: "Soft & Comfortable", description: "Plush texture for a cozy underfoot feel." },
      { title: "Stylish Design", description: "Enhances the look of your bedroom effortlessly." },
      { title: "Floor Protection", description: "Protects your floors from wear, dust & scratches." },
      { title: "Perfect Fit", description: "Ideal beside your bed for a polished look." }
    ],
    closingLine: "Style That Runs With Comfort."
  },
  {
    matchSlugs: ['show-piece', 'show-pieces', 'show-piece-vintage-wall-d-cor'],
    tagline: "Timeless Charm. Historic Elegance.",
    description: "Antique-inspired wall showpieces crafted to bring rustic refinement, depth, and historic character into modern living rooms and studies.",
    features: [
      { title: "Vintage Appeal", description: "Antique-inspired design that brings history to life." },
      { title: "Rustic & Refined", description: "A perfect blend of rustic character and elegant detailing." },
      { title: "Statement Decor", description: "A bold centerpiece that adds depth and personality to your walls." },
      { title: "Perfect for Any Space", description: "Ideal for living rooms, studies, offices and collectors' spaces." }
    ],
    closingLine: "Crafted to elevate every wall."
  },
  {
    matchSlugs: ['shower-curtains'],
    tagline: "Refresh Your Bathroom. Designed for Everyday Living.",
    description: "Add a modern touch to your bathroom with our waterproof shower curtains. Stylish, durable and easy to maintain. Made for everyday luxury.",
    features: [
      { title: "Waterproof", description: "Prevents water splashes." },
      { title: "Durable", description: "Made from strong and long-lasting material." },
      { title: "Easy to Clean", description: "Wipe or machine wash for hassle-free care." },
      { title: "Stylish Designs", description: "Beautiful prints and colors to match your décor." }
    ],
    closingLine: "Style your space. Every day."
  },
  {
    matchSlugs: ['table-cover'],
    tagline: "Refined Texture. Timeless Dining.",
    description: "Made from high-quality, durable & easy-care fabric, this table cover features subtle embroidery and refined patterns to elevate your dining ambiance.",
    features: [
      { title: "Premium Fabric", description: "Made from high-quality, durable & easy-care material." },
      { title: "Elegant Design", description: "Subtle embroidery and refined patterns for a timeless look." },
      { title: "Protects & Beautifies", description: "Shields your table while enhancing your décor." },
      { title: "Perfect for Every Occasion", description: "Ideal for everyday dining or special celebrations." }
    ],
    closingLine: "Refined Texture. Timeless Dining."
  },
  {
    matchSlugs: ['throws'],
    tagline: "Stay warm and stylish with our cozy throws.",
    description: "Crafted from soft, breathable fabrics, they're perfect for snuggling up on the couch or layering your bed. Lightweight yet warm, these throws bring both comfort and elegance to your space.",
    features: [
      { title: "Soft & Breathable", description: "Made from premium fabrics that feel gentle on your skin." },
      { title: "Lightweight & Warm", description: "Perfect balance of warmth and comfort for all seasons." },
      { title: "Stylish & Versatile", description: "Timeless designs that add a pop of color and charm to any space." }
    ],
    closingLine: "Crafted to inspire every idea."
  },
  {
    matchSlugs: ['turbie-towel'],
    tagline: "Dry Hair. No Frizz. All Comfort.",
    description: "Ultra-absorbent, lightweight hair towel wrap with a secure button loop that dries hair fast while protecting from frizz and heat damage.",
    features: [
      { title: "Quick Dry", description: "Absorbs moisture fast for faster drying." },
      { title: "Lightweight", description: "Soft, breathable & comfortable to wear." },
      { title: "Secure Fit", description: "Button loop design keeps it in place." },
      { title: "Gentle Care", description: "Reduces frizz & protects hair." }
    ],
    closingLine: "Everyday Comfort. Effortless Care."
  },
  {
    matchSlugs: ['feng-shui-turtle'],
    tagline: "A Timeless Symbol of Stability, Protection & Good Fortune.",
    description: "The Feng Shui Turtle brings balance, protection and positive energy to your space, shielding your home or office from negativity.",
    features: [
      { title: "Protection", description: "Shields your space from negativity." },
      { title: "Stability", description: "Brings strength, balance and calm." },
      { title: "Perfect for Any Space", description: "Ideal for home, office and shop." }
    ],
    closingLine: "Crafted to elevate every wall."
  },
  {
    matchSlugs: ['wall-art', 'wall-art-2', 'wall-art-metal-discs'],
    tagline: "Elevate Your Walls. Express Your Style.",
    description: "Sculpted metal wall art designed to complement modern interiors with durable materials, lightweight hanging, and artistic depth.",
    features: [
      { title: "Timeless Appeal", description: "Designed to complement a variety of interiors and styles." },
      { title: "Durable & Long Lasting", description: "Made with quality materials to ensure strength and lasting beauty." },
      { title: "Easy to Hang", description: "Lightweight and hassle-free to mount on any wall." },
      { title: "Perfect for Every Space", description: "Ideal for living rooms, bedrooms, hallways, offices and more." },
      { title: "Thoughtful Gift", description: "A perfect choice for housewarmings, festivals and special occasions." }
    ],
    closingLine: "Crafted to elevate every wall."
  },
  {
    matchSlugs: ['wall-art-led-wall-clock'],
    tagline: "Art that lights up your space.",
    description: "This artistic LED wall clock blends a serene moon, mountains, and nature-inspired design with functionality, bringing a calming glow to your interiors.",
    features: [
      { title: "Warm LED Glow", description: "Soft backlight creates a soothing and elegant ambiance." },
      { title: "Accurate Timekeeping", description: "High-quality quartz movement for precise and silent performance." },
      { title: "Nature Inspired", description: "Beautiful blend of moon, mountains, and trees for a peaceful aesthetic." },
      { title: "Perfect for Any Space", description: "Ideal for living rooms, bedrooms, offices, and more." }
    ],
    closingLine: "Make every wall a masterpiece."
  },
  {
    matchSlugs: ['wall-clock', 'vintage-wall-clock'],
    tagline: "Timeless Design. Timeless Living.",
    description: "A perfect blend of vintage charm and modern elegance to elevate your space with antique finishes and bold Roman numerals.",
    features: [
      { title: "Vintage Appeal", description: "Classic antique finish for a timeless look." },
      { title: "Roman Numeral Dial", description: "Easy to read with bold Roman numerals." },
      { title: "Statement Wall Decor", description: "Adds character and charm to any wall." },
      { title: "Perfect for Living Spaces", description: "Ideal for homes, offices & cafés." }
    ],
    closingLine: "Crafted to elevate every wall."
  },
  {
    matchSlugs: ['wall-painting'],
    tagline: "Transform your walls with art that speaks in colors and emotions.",
    description: "Thoughtfully designed wall paintings featuring vibrant colors and fine detailing to bring life, depth, and emotion into any room.",
    features: [
      { title: "Art That Inspires", description: "Thoughtfully designed paintings that bring life to every wall." },
      { title: "Rich in Detail", description: "Vibrant colors and fine detailing for a lasting impression." },
      { title: "Perfect for Every Space", description: "Elevate your home, office, or any corner with timeless art." }
    ],
    closingLine: "Crafted to elevate every wall."
  }
];

async function applyContentBank() {
  console.log('=== APPLYING FULL PRODUCT CONTENT BANK ===');

  // 1. Update vinsho-commerce-seed.json
  const seedPath = 'vinsho-commerce-seed.json';
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  let updatedSeedCount = 0;

  seedData.products.forEach(p => {
    // Find matching entry from contentBank
    const match = contentBank.find(entry => 
      entry.matchSlugs.includes(p.slug) || 
      entry.matchSlugs.some(s => p.slug.includes(s))
    );

    if (match) {
      p.tagline = match.tagline;
      if (match.description) p.description = match.description;
      p.features = match.features;
      p.closing_line = match.closingLine;
      p.closingLine = match.closingLine;
      updatedSeedCount++;
    }
  });

  fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
  console.log(`✓ Updated ${updatedSeedCount} products in ${seedPath}`);

  // 2. Update vinsho-content.json
  const contentPath = 'vinsho-content.json';
  const contentData = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

  let updatedContentCount = 0;

  if (contentData.products) {
    contentData.products.forEach(p => {
      const match = contentBank.find(entry => 
        entry.matchSlugs.includes(p.slug) || 
        entry.matchSlugs.some(s => p.slug.includes(s))
      );

      if (match) {
        p.tagline = match.tagline;
        if (match.description) p.description = match.description;
        p.features = match.features;
        p.closing_line = match.closingLine;
        p.closingLine = match.closingLine;
        updatedContentCount++;
      }
    });
    fs.writeFileSync(contentPath, JSON.stringify(contentData, null, 2), 'utf8');
    console.log(`✓ Updated ${updatedContentCount} products in ${contentPath}`);
  }

  // 3. Update vinsho-taxonomy.json if products array exists
  const taxonomyPath = 'vinsho-taxonomy.json';
  const taxonomyData = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));

  if (taxonomyData.products) {
    let updatedTaxCount = 0;
    taxonomyData.products.forEach(p => {
      const match = contentBank.find(entry => 
        entry.matchSlugs.includes(p.slug) || 
        entry.matchSlugs.some(s => p.slug.includes(s))
      );

      if (match) {
        p.tagline = match.tagline;
        if (match.description) p.description = match.description;
        p.features = match.features;
        p.closing_line = match.closingLine;
        p.closingLine = match.closingLine;
        updatedTaxCount++;
      }
    });
    fs.writeFileSync(taxonomyPath, JSON.stringify(taxonomyData, null, 2), 'utf8');
    console.log(`✓ Updated ${updatedTaxCount} products in ${taxonomyPath}`);
  }

  // 4. Update Database vinsho.db
  const db = new Database('data/vinsho.db');
  const updateDbStmt = db.prepare(`
    UPDATE products
    SET tagline = ?, description = ?, features = ?, closing_line = ?
    WHERE slug = ?
  `);

  let dbUpdatedCount = 0;

  const dbProducts = db.prepare("SELECT id, slug FROM products").all();

  dbProducts.forEach(p => {
    const match = contentBank.find(entry => 
      entry.matchSlugs.includes(p.slug) || 
      entry.matchSlugs.some(s => p.slug.includes(s))
    );

    if (match) {
      updateDbStmt.run(
        match.tagline,
        match.description || '',
        JSON.stringify(match.features),
        match.closingLine,
        p.slug
      );
      dbUpdatedCount++;
    }
  });

  console.log(`✓ Updated ${dbUpdatedCount} product records directly in SQLite database vinsho.db`);
}

applyContentBank();
