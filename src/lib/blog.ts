export interface BlogSection {
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  category: string;
  excerpt: string;
  featuredImage?: string;
  metaTitle: string;
  metaDescription: string;
  sections: BlogSection[];
  ctaText?: string;
  ctaLink?: string;
}

export const OFFICIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    slug: 'how-to-create-a-luxury-looking-bedroom-without-overdoing-it',
    title: 'How to Create a Luxury-Looking Bedroom Without Overdoing It',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'INTERIOR INSPIRATION',
    featuredImage: '/images/vinsho/products/WhatsApp-Image-2026-01-03-at-16.13.11.jpeg',
    metaTitle: 'How to Create a Luxury-Looking Bedroom | VINSHO Journal',
    metaDescription: 'Discover how to create a luxurious, balanced bedroom with comfortable textures, calm tones, and restraint.',
    excerpt: 'A luxurious bedroom does not need to be filled with expensive furniture or excessive decoration. The secret is creating balance between comfort, texture, colour, and space.',
    ctaText: 'Read Article →',
    ctaLink: '/collections/home-furnishing',
    sections: [
      {
        paragraphs: [
          'A luxurious bedroom does not need to be filled with expensive furniture or excessive decoration. The secret is creating balance between comfort, texture, colour, and space.',
          'Start with the foundation. Choose bedding in calm, complementary tones and introduce texture through cushions, throws, and soft furnishings. Instead of using many different patterns, select one dominant pattern and keep the remaining elements subtle.',
          'Lighting also plays an important role. Warm, soft lighting can make a bedroom feel more relaxed and inviting, while decorative elements such as vases, candles, or wall art can add personality without overwhelming the room.',
          'The final step is restraint. Leave enough empty space around your decorative pieces so that each element has room to breathe.',
          'A well-designed bedroom should feel comfortable first and beautiful second.'
        ]
      }
    ]
  },
  {
    id: '2',
    slug: 'how-to-choose-the-right-bedsheet-for-your-bedroom',
    title: 'How to Choose the Right Bedsheet for Your Bedroom',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'HOME FURNISHING',
    featuredImage: '/images/vinsho/products/WhatsApp-Image-2026-01-03-at-16.13.12.jpeg',
    metaTitle: 'How to Choose the Right Bedsheet | VINSHO Journal',
    metaDescription: 'Learn how to select the ideal bedsheet for visual harmony, comfort, and bedroom design.',
    excerpt: 'A bedsheet is one of the largest visual elements in a bedroom, which makes it an important part of the overall design.',
    ctaText: 'Explore Bedsheets →',
    ctaLink: '/collections/home-furnishing/bedsheet',
    sections: [
      {
        paragraphs: [
          'A bedsheet is one of the largest visual elements in a bedroom, which makes it an important part of the overall design.',
          'Start by considering the colour palette of your room. Neutral shades create a calm and timeless atmosphere, while subtle patterns can introduce personality without becoming overwhelming.',
          'Pay attention to fabric and texture as well. A comfortable bedsheet should feel pleasant against the skin while complementing the other textiles in the room.',
          'For a more refined look, coordinate your bedsheet with cushions, pillows, curtains, or a bedcover rather than trying to match everything exactly.',
          'The goal is not perfect matching. The goal is visual harmony.'
        ]
      }
    ]
  },
  {
    id: '3',
    slug: 'how-to-style-cushions-like-an-interior-designer',
    title: 'How to Style Cushions Like an Interior Designer',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'HOME FURNISHING',
    featuredImage: '/images/vinsho/products/Untitled-design-2-1.png',
    metaTitle: 'How to Style Cushions Like an Interior Designer | VINSHO Journal',
    metaDescription: 'Simple techniques to refresh your living room or bedroom with cushion textures, sizes, and colours.',
    excerpt: 'Cushions are one of the easiest ways to refresh a living room or bedroom without changing the entire space.',
    ctaText: 'Explore Cushions →',
    ctaLink: '/collections/home-furnishing/cushion',
    sections: [
      {
        paragraphs: [
          'Cushions are one of the easiest ways to refresh a living room or bedroom without changing the entire space.',
          'Start with a simple base colour and introduce one or two complementary shades. Mix different sizes and textures to create depth, but avoid using too many patterns at once.',
          'A combination of solid colours, subtle prints, and textured fabrics usually creates a more sophisticated result than using identical cushions throughout the room.',
          'For a premium look, allow some breathing space between patterns and keep the overall colour palette consistent.',
          'Small changes in cushions can make a surprisingly large difference to the character of a room.'
        ]
      }
    ]
  },
  {
    id: '4',
    slug: 'curtains-the-finishing-touch-that-changes-a-room',
    title: 'Curtains: The Finishing Touch That Changes a Room',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'HOME FURNISHING',
    featuredImage: '/images/vinsho/products/Curtain.jpeg',
    metaTitle: 'Curtains: The Finishing Touch | VINSHO Journal',
    metaDescription: 'Discover how curtains influence room brightness, size, warmth, and elegance.',
    excerpt: 'Curtains do much more than control light and privacy. They can influence how large, bright, warm, or elegant a room feels.',
    ctaText: 'Explore Curtains →',
    ctaLink: '/collections/home-furnishing/curtains',
    sections: [
      {
        paragraphs: [
          'Curtains do much more than control light and privacy. They can influence how large, bright, warm, or elegant a room feels.',
          'For a softer appearance, choose fabrics that fall naturally and complement the colours already present in the room.',
          'Longer curtains can create a more dramatic appearance, while lighter fabrics can make a space feel open and airy.',
          'When choosing curtains, consider the room\'s natural light, wall colours, furniture, and overall style.',
          'The right curtains should feel like part of the room rather than an afterthought.'
        ]
      }
    ]
  },
  {
    id: '5',
    slug: '5-simple-ways-to-make-your-home-feel-more-premium',
    title: '5 Simple Ways to Make Your Home Feel More Premium',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'HOME DÉCOR',
    featuredImage: '/images/vinsho/products/WhatsApp-Image-2025-12-30-at-13.52.37.jpeg',
    metaTitle: '5 Ways to Make Your Home Feel Premium | VINSHO Journal',
    metaDescription: 'Simple and practical ways to make your living space feel refined, intentional, and luxurious.',
    excerpt: 'You do not need to completely redesign your home to make it feel more refined.',
    ctaText: 'Explore Home Décor →',
    ctaLink: '/collections/home-decor',
    sections: [
      {
        paragraphs: [
          'You do not need to completely redesign your home to make it feel more refined.',
          '1. Create a consistent colour palette.\nChoose a small group of complementary colours and repeat them throughout the room.',
          '2. Add texture.\nCombine soft furnishings, rugs, curtains, cushions, and decorative objects to create visual depth.',
          '3. Introduce one statement piece.\nA distinctive vase, artwork, showpiece, or decorative object can become the focal point of a room.',
          '4. Improve lighting.\nWarm and layered lighting can dramatically change the atmosphere of an interior.',
          '5. Leave some empty space.\nA premium interior is rarely overcrowded. Give important objects enough space to stand out.',
          'The result should feel intentional rather than over-decorated.'
        ]
      }
    ]
  },
  {
    id: '6',
    slug: 'how-to-use-wall-art-without-making-a-room-look-crowded',
    title: 'How to Use Wall Art Without Making a Room Look Crowded',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'HOME DÉCOR',
    featuredImage: '/images/vinsho/products/WhatsApp-Image-2026-01-07-at-18.48.12.jpeg',
    metaTitle: 'How to Use Wall Art Elegantly | VINSHO Journal',
    metaDescription: 'How to choose and arrange wall art to add character without cluttering your space.',
    excerpt: 'Wall art can transform an empty wall, but adding too many pieces can make a room feel visually heavy.',
    ctaText: 'Explore Wall Décor →',
    ctaLink: '/collections/home-decor/wall-art',
    sections: [
      {
        paragraphs: [
          'Wall art can transform an empty wall, but adding too many pieces can make a room feel visually heavy.',
          'Start by identifying the main wall you want to highlight. Choose artwork that complements the existing furniture and colour palette rather than competing with it.',
          'Large artwork can work well as a single statement piece, while smaller pieces can be arranged as a balanced group.',
          'Keep the surrounding area relatively calm so the artwork remains the visual focus.',
          'The best wall décor adds personality without taking attention away from the room itself.'
        ]
      }
    ]
  },
  {
    id: '7',
    slug: 'housewarming-gift-ideas-for-a-new-home',
    title: 'Housewarming Gift Ideas for a New Home',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'THOUGHTFUL GIFTING',
    featuredImage: '/images/vinsho/products/WhatsApp-Image-2025-12-30-at-13.52.37-1.jpeg',
    metaTitle: 'Housewarming Gift Ideas for a New Home | VINSHO Journal',
    metaDescription: 'Elegant and memorable housewarming gift ideas that add warmth to new living spaces.',
    excerpt: 'A new home marks the beginning of a new chapter, which makes housewarming gifts especially meaningful.',
    ctaText: 'Explore Gifting Collection →',
    ctaLink: '/collections/gifting-collection',
    sections: [
      {
        paragraphs: [
          'A new home marks the beginning of a new chapter, which makes housewarming gifts especially meaningful.',
          'Decorative pieces such as vases, candles, photo frames, wall décor, and thoughtful home accessories can add warmth and personality to a new space.',
          'When choosing a housewarming gift, consider pieces that are elegant enough to complement different interior styles.',
          'A useful gift can become part of someone\'s everyday surroundings, making it more memorable long after the occasion.'
        ]
      }
    ]
  },
  {
    id: '8',
    slug: 'how-to-choose-a-thoughtful-gift-for-any-occasion',
    title: 'How to Choose a Thoughtful Gift for Any Occasion',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'THOUGHTFUL GIFTING',
    featuredImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=1000',
    metaTitle: 'How to Choose a Thoughtful Gift | VINSHO Journal',
    metaDescription: 'Guidelines for choosing considered, personal gifts for every milestone and celebration.',
    excerpt: 'The best gifts usually begin with understanding the person rather than the occasion.',
    ctaText: 'Explore Gifts →',
    ctaLink: '/collections/gifting-collection',
    sections: [
      {
        paragraphs: [
          'The best gifts usually begin with understanding the person rather than the occasion.',
          'Think about their personality, interests, lifestyle, and the spaces they enjoy spending time in.',
          'For someone who enjoys decorating, a beautiful home accessory may be more meaningful than a generic gift. For someone who values personal memories, photo frames or decorative pieces can carry a more personal feeling.',
          'The goal is simple: choose something that feels considered.',
          'Because a thoughtful gift is not just an object. It is a small expression of attention and care.'
        ]
      }
    ]
  },
  {
    id: '9',
    slug: 'modern-minimalism-vs-traditional-elegance',
    title: 'Modern Minimalism vs Traditional Elegance',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'INTERIOR INSPIRATION',
    featuredImage: '/images/vinsho/products/WhatsApp-Image-2026-01-20-at-22.59.56-1.jpeg',
    metaTitle: 'Modern Minimalism vs Traditional Elegance | VINSHO Journal',
    metaDescription: 'Explore the balance between clean modern lines and rich traditional interior textures.',
    excerpt: 'Modern minimalism focuses on simplicity, clean lines, restrained colours, and functional design.',
    ctaText: 'Explore Collections →',
    ctaLink: '/collections',
    sections: [
      {
        paragraphs: [
          'Modern minimalism focuses on simplicity, clean lines, restrained colours, and functional design.',
          'Traditional interiors often embrace richer textures, decorative details, warm tones, and objects with a sense of history.',
          'Neither approach is better than the other.',
          'The most interesting interiors often combine elements of both. A clean modern room can gain warmth through traditional décor, while a more traditional space can feel contemporary through simpler furnishings.',
          'Choose the elements that reflect your personality rather than following a style simply because it is trending.'
        ]
      }
    ]
  },
  {
    id: '10',
    slug: 'how-to-refresh-your-living-room-without-renovating',
    title: 'How to Refresh Your Living Room Without Renovating',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'INTERIOR INSPIRATION',
    featuredImage: '/images/vinsho/products/WhatsApp-Image-2025-10-14-at-17.29.34.jpeg',
    metaTitle: 'How to Refresh Your Living Room | VINSHO Journal',
    metaDescription: 'Transform your living room using textiles, accents, and spatial rearrangement.',
    excerpt: 'Refreshing a living room does not always require new furniture or major changes.',
    ctaText: 'Explore Living Collection →',
    ctaLink: '/collections/home-furnishing',
    sections: [
      {
        paragraphs: [
          'Refreshing a living room does not always require new furniture or major changes.',
          'Start with the soft furnishings. Changing cushions, curtains, rugs, or throws can immediately alter the atmosphere.',
          'Next, introduce one or two decorative elements such as a vase, candle, artwork, or statement piece.',
          'Finally, reconsider the arrangement of existing objects. Sometimes creating more space is enough to make a room feel completely different.',
          'A thoughtful refresh can give your living room a new personality without a complete renovation.'
        ]
      }
    ]
  },
  {
    id: '11',
    slug: 'diwali-home-decor-ideas-for-a-warm-and-elegant-celebration',
    title: 'Diwali Home Décor Ideas for a Warm and Elegant Celebration',
    author: 'VINSHO Editorial',
    date: 'February 2026',
    category: 'SEASONAL INSPIRATION',
    featuredImage: '/images/vinsho/site/1-1.png',
    metaTitle: 'Diwali Home Décor Ideas | VINSHO Journal',
    metaDescription: 'Ideas for creating a festive, warm, and elegant atmosphere during Diwali.',
    excerpt: 'Diwali is a celebration of light, warmth, and togetherness, making it the perfect occasion to refresh your home décor.',
    ctaText: 'Explore Festive Collection →',
    ctaLink: '/collections/gifting-collection/candles',
    sections: [
      {
        paragraphs: [
          'Diwali is a celebration of light, warmth, and togetherness, making it the perfect occasion to refresh your home décor.',
          'Begin with the entrance. A simple rangoli arrangement, decorative toran, or carefully placed lighting can create a welcoming first impression.',
          'Inside the home, use warm lighting, diyas, candles, decorative pieces, and subtle festive accents to create an inviting atmosphere.',
          'Avoid overcrowding the space. A few well-placed elements can often create a stronger visual impact than decorating every available surface.',
          'The aim is to create a home that feels festive while still feeling like your own.'
        ]
      }
    ]
  }
];

export function getAllBlogPosts(): BlogPost[] {
  return OFFICIAL_BLOG_POSTS;
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return OFFICIAL_BLOG_POSTS.find((p) => p.slug === slug);
}

export function searchBlogPosts(query: string): BlogPost[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return OFFICIAL_BLOG_POSTS;

  return OFFICIAL_BLOG_POSTS.filter((post) => {
    const inTitle = post.title.toLowerCase().includes(q);
    const inExcerpt = post.excerpt.toLowerCase().includes(q);
    const inCategory = post.category.toLowerCase().includes(q);
    const inAuthor = post.author.toLowerCase().includes(q);
    const inContent = post.sections.some((sec) =>
      (sec.heading && sec.heading.toLowerCase().includes(q)) ||
      sec.paragraphs.some((p) => p.toLowerCase().includes(q))
    );

    return inTitle || inExcerpt || inCategory || inAuthor || inContent;
  });
}
