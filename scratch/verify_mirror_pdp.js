async function verifyMirrorPdp() {
  const res = await fetch('http://localhost:4321/product/mirror');
  const html = await res.text();

  console.log('Status code:', res.status);
  console.log('Contains DESIGN & CRAFTSMANSHIP HIGHLIGHTS:', html.includes('DESIGN &amp; CRAFTSMANSHIP') || html.includes('DESIGN & CRAFTSMANSHIP'));
  console.log('Contains Sunburst Design:', html.includes('Sunburst Design'));
  console.log('Contains Layered Detailing:', html.includes('Layered Detailing'));
  console.log('Contains Warm Metallic Finish:', html.includes('Warm Metallic Finish'));
  console.log('Contains Statement Wall Decor:', html.includes('Statement Wall Decor'));
  console.log('Contains Quote:', html.includes('Designed to reflect timeless elegance.'));
}

verifyMirrorPdp().catch(console.error);
