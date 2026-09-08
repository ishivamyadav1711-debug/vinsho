async function test() {
  const trivets = [
    {
      name: 'Striped Trivet — Set',
      slug: 'striped-trivet-set',
      images: [
        '/images/products/striped-trivet-set/striped-trivet-set-01.jpg',
        '/images/products/striped-trivet-set/striped-trivet-set-02.jpg',
        '/images/products/striped-trivet-set/striped-trivet-set-03.jpg'
      ]
    },
    {
      name: 'Red Assiago Trivet — Set',
      slug: 'red-assiago-trivet-set',
      images: [
        '/images/products/red-assiago-trivet-set/red-assiago-trivet-set-01.jpg',
        '/images/products/red-assiago-trivet-set/red-assiago-trivet-set-02.jpg',
        '/images/products/red-assiago-trivet-set/red-assiago-trivet-set-03.jpg'
      ]
    },
    {
      name: 'ChocoChip Trivet — Set',
      slug: 'chocochip-trivet-set',
      images: [
        '/images/products/chocochip-trivet-set/chocochip-trivet-set-01.jpg'
      ]
    },
    {
      name: 'Cork Fine Natural Trivet — Set',
      slug: 'cork-fine-natural-trivet-set',
      images: [
        '/images/products/cork-fine-natural-trivet-set/cork-fine-natural-trivet-set-01.jpg',
        '/images/products/cork-fine-natural-trivet-set/cork-fine-natural-trivet-set-02.jpg',
        '/images/products/cork-fine-natural-trivet-set/cork-fine-natural-trivet-set-03.jpg'
      ]
    }
  ];

  for (const t of trivets) {
    console.log(`\n=== Testing: ${t.name} (${t.slug}) ===`);
    for (const img of t.images) {
      try {
        const res = await fetch(`http://localhost:4321${img}`);
        console.log(`  Image ${img} -> HTTP ${res.status} (${res.headers.get('content-type')})`);
      } catch (err) {
        console.error(`  Image error ${img}:`, err.message);
      }
    }
    try {
      const pdpRes = await fetch(`http://localhost:4321/product/${t.slug}`);
      console.log(`  PDP Route -> HTTP ${pdpRes.status}`);
      if (pdpRes.status === 200) {
        const html = await pdpRes.text();
        console.log(`  Primary Image embedded in HTML?`, html.includes(t.images[0]));
      }
    } catch (err) {
      console.error(`  PDP error ${t.slug}:`, err.message);
    }
  }
}

test();
