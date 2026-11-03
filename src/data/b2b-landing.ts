/**
 * Copy for the B2B landing page (/landing-page/v2).
 *
 * Text follows the "VINSHO B2B Landing Page" design. Items in [square brackets]
 * are placeholders the business still needs to confirm; replace them here and the
 * page updates — no layout changes needed.
 *
 * Prices and product links in `giftTiers` are looked up live from the database by
 * slug (see the page); `fallbackPrice` is only used when a product can't be found.
 * Photos are chosen here (`image`) so the showcase stays curated.
 */

export const announcement = 'Now booking Christmas & New Year corporate gifting · Pan-India delivery';

export const nav = [
  { label: 'Corporate Gifting', href: '#corporate-gifting' },
  { label: 'Hospitality', href: '#hospitality' },
  { label: 'Trade Partners', href: '#trade-partners' },
  { label: 'Reviews', href: '#reviews' }
];

export const hero = {
  eyebrow: 'B2B supply · Greater Noida, Delhi NCR',
  // Rendered as: "Décor, linen & gifts your <em>business</em> will be proud of"
  titleBefore: 'Décor, linen & gifts your',
  titleEmphasis: 'business',
  titleAfter: 'will be proud of',
  lead: 'Curated corporate gifts, hotel furnishings and trade-priced décor, supplied in bulk and shipped across India.',
  primaryCta: 'WhatsApp for Bulk Price',
  secondaryCta: 'Download Catalogue',
  quoteTurnaround: '2 hrs',
  images: {
    main: { src: '/images/vinsho/site/Bedsheet1.jpeg', alt: 'Styled bedroom with VINSHO bedsheet and décor' },
    topRight: { src: '/products/candles/22-3-rose-candle-bouquet.jpg', alt: '3-Rose Candle Bouquet', caption: '3-Rose Candle Bouquet' },
    bottomRight: { src: '/images/vinsho/site/WhatsApp-Image-2026-01-21-at-10.23.07-1.jpeg', alt: 'Curated gifting box', caption: 'Curated gifting box' }
  }
};

export const trustPoints = [
  { icon: 'truck', label: 'Pan-India shipping' },
  { icon: 'shield', label: 'Quality-checked before dispatch' },
  { icon: 'store', label: 'Showroom at India Expo Plaza' },
  { icon: 'chat', label: 'Free consultation & quote' }
];

export const audiences = {
  eyebrow: 'Who we supply',
  title: 'One partner for every business need',
  lead: 'Choose your business to see the products, pricing and process built for you.',
  cards: [
    {
      title: 'Corporate Gifting',
      text: 'Employee & client gifts for festivals, onboarding and milestones.',
      link: 'Explore gift tiers',
      href: '#corporate-gifting',
      image: '/images/vinsho/products/Corporate-gifting/05_key_chain_combo_10.jpg',
      alt: 'Corporate gift combo',
      tone: 'tint1'
    },
    {
      title: 'Hotels & Homestays',
      text: 'Bedding, bath and décor for hotels, homestays and Airbnbs.',
      link: 'See the room kit',
      href: '#hospitality',
      image: '/images/vinsho/products/WhatsApp-Image-2026-01-03-at-16.13.12.jpeg',
      alt: 'Crisp VINSHO bedsheet on a bed',
      tone: 'tint2'
    },
    {
      title: 'Designers & Retailers',
      text: 'Trade-priced décor for designers, gift shops and event planners.',
      link: 'Become a partner',
      href: '#trade-partners',
      image: '/images/vinsho/site/WhatsApp-Image-2026-01-21-at-10.23.08.jpeg',
      alt: 'Styled décor accents',
      tone: 'tint3'
    }
  ]
};

export interface TierProduct {
  label: string;
  /** Database slugs to try, in order. The first one found supplies the live price and link. */
  slugs: string[];
  fallbackPrice: number;
  image: string;
}

export interface GiftTier {
  badge: string;
  title: string;
  note: string;
  featured?: boolean;
  products: TierProduct[];
}

export const giftingSection = {
  eyebrow: 'Corporate gifting',
  title: 'Gifts that get remembered, in every budget',
  lead: 'Hand-poured candles, natural cork planters and décor pieces your team will actually keep.',
  cta: 'Get Gift Catalogue',
  footnote: 'Retail prices shown. Bulk slabs: [confirm, e.g. 25+ / 50+ / 100+ units] · Custom packaging & message cards: [confirm]'
};

export const giftTiers: GiftTier[] = [
  {
    badge: 'Under ₹500',
    title: 'Thoughtful & light',
    note: 'Ideal for large teams & event giveaways',
    products: [
      {
        label: 'Blushing Rose Candle Bouquet',
        slugs: ['blushing-rose-candle-bouquet'],
        fallbackPrice: 480,
        image: '/products/candles/23-blushing-rose-candle-bouquet.jpg'
      },
      {
        label: '3-Shade Flower Jar Candle',
        slugs: ['3-shade-flower-jar-candle'],
        fallbackPrice: 499,
        image: '/products/candles/15-3-shade-flower-jar-candle.jpg'
      }
    ]
  },
  {
    badge: 'Around ₹1,000',
    title: 'Desk-worthy',
    note: 'Ideal for employees & onboarding kits',
    featured: true,
    products: [
      {
        label: 'Test Tube Planter Combo',
        slugs: ['box-print-table-top-test-tube-holder-combo-46', 'rectangular-test-tube-planter'],
        fallbackPrice: 900,
        image: '/images/vinsho/products/Corporate-gifting/27_rectangular_test_tube_planter.jpg'
      },
      {
        label: 'Black Beauty Candle',
        slugs: ['black-beauty-candle'],
        fallbackPrice: 1000,
        image: '/images/vinsho/products/51-black-beauty-candle.jpg'
      }
    ]
  },
  {
    badge: 'Premium ₹1,200+',
    title: 'For clients & leaders',
    note: 'Ideal for client gifting & leadership',
    products: [
      {
        label: 'Box Print Table Top Planter',
        slugs: ['box-print-table-top-tt-planter', 'box-print-planter-cork-table-top-planter'],
        fallbackPrice: 1250,
        image: '/images/fridge-cover-new.jpg'
      },
      {
        label: 'Blue & White Floral Bowl Candle',
        slugs: ['blue-and-white-floral-bowl-candle'],
        fallbackPrice: 2280,
        image: '/products/candles/03-blue-and-white-floral-bowl-candle.jpg'
      }
    ]
  }
];

export const hospitality = {
  eyebrow: 'Hotels · Homestays · Airbnb',
  title: 'Guests notice the details',
  lead: 'Refresh every room before peak season with one supplier for linen, bath and décor.',
  before: { label: 'Before', caption: 'Plain guest room' },
  after: { label: 'After', caption: 'Same room with VINSHO linen & décor' },
  items: ['Bedsheets', 'Bedcovers', 'Bath mats', 'Anti-skid rubber mats', 'Aprons for kitchen staff', 'Lobby flowers & décor'],
  cta: 'Send your room count for a quote'
};

export const tradePartners = {
  eyebrow: 'Trade partner program',
  title: 'Your décor sourcing partner',
  lead: 'Designers, gift shops and event planners get trade pricing, consistent quality and repeat supply from one partner.',
  groups: [
    {
      icon: 'pen',
      title: 'Interior designers & architects',
      text: 'Wall art, wall clocks, showpieces, Buddha, Bonsai Jade Plant, artificial flowers'
    },
    { icon: 'store', title: 'Gift shops & boutiques', text: 'Candle bouquets, jar & bowl candles, cork planters' },
    { icon: 'star', title: 'Wedding & event planners', text: 'Return gifts: rose bouquets, Ocean & Orange Pumpkin bowl candles' }
  ],
  cta: 'Apply for trade pricing',
  image: { src: '/images/vinsho/site/WhatsApp-Image-2026-01-21-at-10.23.07.jpeg', alt: 'Wooden double-sided wall clock in a styled hallway' }
};

export const reviews = {
  eyebrow: 'Client stories',
  title: 'What our business clients say',
  sampleNote: 'Sample layout · replace with real client reviews',
  items: [
    {
      quote: '[Client quote: e.g. how the corporate gift order went, quality, delivery on time.]',
      initials: 'HR',
      name: '[Client name]',
      role: 'HR Manager, [Company], [City]',
      tone: 'tint1'
    },
    {
      quote: '[Client quote: e.g. how the linen held up, guest feedback, ease of reordering.]',
      initials: 'HO',
      name: '[Client name]',
      role: 'Owner, [Homestay / Hotel], [City]',
      tone: 'tint2'
    },
    {
      quote: '[Client quote: e.g. trade pricing, finish of the décor pieces, clients’ reaction.]',
      initials: 'ID',
      name: '[Client name]',
      role: 'Interior Designer, [Studio], [City]',
      tone: 'tint3'
    }
  ],
  photos: ['Photo: bulk order packed for dispatch', 'Photo: client delivery / unboxing', 'Photo: India Expo Plaza showroom']
};

export const process = {
  eyebrow: 'How it works',
  title: 'From WhatsApp to your doorstep',
  steps: [
    { title: 'Share your need', text: 'Quantity, budget per piece, city and deadline on WhatsApp.' },
    { title: 'Get catalogue & quote', text: 'Options picked for your business, within 2 hours.' },
    { title: 'Approve a sample', text: 'See the piece first, or visit our Greater Noida showroom.' },
    { title: 'Packed & delivered', text: 'Carefully packed and shipped anywhere in India.' }
  ]
};

export const quoteSection = {
  eyebrow: 'Get a quote',
  title: 'Tell us what you need',
  lead: 'WhatsApp is the fastest way to get pricing. Prefer a form? Fill it in and we’ll reply on WhatsApp.',
  businessTypes: ['Corporate / HR buyer', 'Hotel / Homestay / Airbnb', 'Interior designer / Architect', 'Gift shop / Boutique', 'Wedding / Event planner', 'Other'],
  budgets: ['Under ₹500', '₹500 – ₹1,000', '₹1,000 – ₹2,000', '₹2,000+'],
  submit: 'Request my quote'
};

export const faqs = [
  { q: 'What is the minimum order quantity?', a: '[Confirm MOQ per product category.]' },
  { q: 'Do you provide a GST invoice?', a: '[Confirm GST invoicing details.]' },
  { q: 'Can you add our logo or custom packaging?', a: '[Confirm branding and packaging options.]' },
  { q: 'How long does delivery take?', a: 'It depends on quantity and your city; every quote includes an estimated delivery date.' },
  { q: 'What are the payment terms?', a: '[Confirm advance / balance terms.]' }
];

export const closingBanner = {
  title: 'Planning a bulk order this season?',
  text: 'Message us now and get the catalogue and pricing within 2 hours.',
  cta: 'WhatsApp for Bulk Price'
};

/** Pre-filled WhatsApp messages for each call to action. */
export const whatsappMessages = {
  bulkPrice: 'Hi VINSHO, I’d like bulk pricing for a business order.',
  catalogue: 'Hi VINSHO, please send me your B2B catalogue.',
  giftCatalogue: 'Hi VINSHO, please send me your corporate gift catalogue.',
  roomCount: 'Hi VINSHO, I run a hotel/homestay and would like a quote. Room count: ',
  tradePricing: 'Hi VINSHO, I’d like to apply for trade pricing.'
};
