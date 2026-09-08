import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:4321';

// 1. Static Pages
const mainPages = [
  { name: 'Home Page', path: '/' },
  { name: 'All Products', path: '/products' },
  { name: 'Collections Index', path: '/collections' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact Us', path: '/contact' },
  { name: 'Cart', path: '/cart' },
  { name: 'Create Your Hamper (Gifting)', path: '/gifting/create-your-hamper' },
  { name: 'Grievance Officer', path: '/grievance-officer' },
];

const authPages = [
  { name: 'Login', path: '/login' },
  { name: 'Sign Up', path: '/signup' },
  { name: 'Forgot Password', path: '/forgot-password' },
  { name: 'Reset Password', path: '/reset-password' },
];

const accountPages = [
  { name: 'User Account Dashboard', path: '/account' },
  { name: 'User Orders History', path: '/account/orders' },
];

const checkoutPages = [
  { name: 'Checkout Index', path: '/checkout' },
  { name: 'Checkout - Delivery Address', path: '/checkout/address' },
  { name: 'Checkout - Payment', path: '/checkout/payment' },
  { name: 'Checkout - Order Confirmation', path: '/checkout/confirmation' },
];

const policyPages = [
  { name: 'Privacy Policy', path: '/policies/privacy' },
  { name: 'Terms of Service', path: '/policies/terms' },
  { name: 'Shipping Policy', path: '/policies/shipping' },
  { name: 'Return Policy', path: '/policies/returns' },
  { name: 'Cancellation Policy', path: '/policies/cancellation' },
];

const adminPages = [
  { name: 'Admin Dashboard', path: '/admin' },
  { name: 'Admin Login', path: '/admin/login' },
  { name: 'Admin Analytics', path: '/admin/analytics' },
  { name: 'Admin Audit Logs', path: '/admin/audit-logs' },
  { name: 'Admin CRM', path: '/admin/crm' },
  { name: 'Admin Customers', path: '/admin/customers' },
  { name: 'Admin Leads', path: '/admin/leads' },
  { name: 'Admin Products Management', path: '/admin/products' },
  { name: 'Admin Returns Management', path: '/admin/returns' },
  { name: 'Admin Settings', path: '/admin/settings' },
];

// Read Products
let products = [];
try {
  const prodData = fs.readFileSync('vinsho_products.json', 'utf8');
  products = JSON.parse(prodData);
} catch (e) {
  try {
    const taxData = fs.readFileSync('vinsho-taxonomy.json', 'utf8');
    const parsed = JSON.parse(taxData);
    products = parsed.products || [];
  } catch (err) {}
}

const productLinks = products.map(p => ({
  name: p.name || p.slug,
  path: `/product/${p.slug}`
}));

// Collections
const collections = [
  { name: 'Home Furnishing Collection', path: '/collections/home-furnishing' },
  { name: 'Home Decor Collection', path: '/collections/home-decor' },
  { name: 'Gifting Collection', path: '/collections/gifting-collection' },
];

// Sub-collections (from taxonomy if available)
let subCollections = [];
try {
  const taxData = fs.readFileSync('vinsho-taxonomy.json', 'utf8');
  const tax = JSON.parse(taxData);
  if (tax.collections) {
    tax.collections.forEach(col => {
      if (col.subcategories) {
        col.subcategories.forEach(sub => {
          subCollections.push({
            name: `${col.name} -> ${sub.name}`,
            path: `/collections/${col.key}/${sub.key}`
          });
        });
      }
    });
  }
} catch (e) {}

// API Endpoints
let apiRoutes = [];
function findApiFiles(dir, baseRoute = '/api') {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      findApiFiles(path.join(dir, file.name), `${baseRoute}/${file.name}`);
    } else {
      const nameWithoutExt = file.name.replace(/\.(js|ts|astro)$/, '');
      if (nameWithoutExt === 'index') {
        apiRoutes.push(baseRoute);
      } else {
        apiRoutes.push(`${baseRoute}/${nameWithoutExt}`);
      }
    }
  }
}
findApiFiles(path.join(process.cwd(), 'src/pages/api'));

console.log(JSON.stringify({
  mainPages,
  authPages,
  accountPages,
  checkoutPages,
  policyPages,
  collections,
  subCollections,
  productLinks,
  adminPages,
  apiRoutes
}, null, 2));
