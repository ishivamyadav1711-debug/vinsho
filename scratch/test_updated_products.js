async function test() {
  try {
    console.log('--- Testing Ocean Mist Bag Combo 18 ---');
    const res1 = await fetch('http://localhost:4321/images/vinsho/products/Corporate-gifting/08_ocean_mist_bag_combo_18.jpg');
    console.log('Image status:', res1.status, 'Content-Type:', res1.headers.get('content-type'));

    console.log('\n--- Testing Web Printed Trivet Images ---');
    for (const name of ['42_web_printed_trivet.jpg', '42_web_printed_trivet_2.jpg', '42_web_printed_trivet_3.jpg']) {
      const res = await fetch(`http://localhost:4321/images/vinsho/products/Corporate-gifting/${name}`);
      console.log(`${name} status:`, res.status, 'Content-Type:', res.headers.get('content-type'));
    }
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

test();
