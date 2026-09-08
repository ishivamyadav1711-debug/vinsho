async function test() {
  try {
    console.log('Testing image URL...');
    const imgRes = await fetch('http://localhost:4321/images/vinsho/products/Corporate-gifting/49_round_napkin_ring.jpg');
    console.log('Image HTTP status:', imgRes.status);
    console.log('Image Content-Type:', imgRes.headers.get('content-type'));

    console.log('\nTesting Product Page URL...');
    const pdpRes = await fetch('http://localhost:4321/product/round-napkin-ring');
    console.log('PDP HTTP status:', pdpRes.status);
    if (pdpRes.status === 200) {
      const html = await pdpRes.text();
      console.log('PDP HTML contains 49_round_napkin_ring.jpg?', html.includes('49_round_napkin_ring.jpg'));
    } else {
      console.log('PDP HTTP status was not 200, checking html preview...');
      const text = await pdpRes.text();
      console.log(text.substring(0, 300));
    }
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

test();
