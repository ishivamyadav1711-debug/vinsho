/**
 * Shopify Storefront API Client Helper for VINSHO Headless Commerce.
 *
 * Configured via environment variables:
 * - SHOPIFY_STORE_DOMAIN (e.g. vinsho-official.myshopify.com)
 * - SHOPIFY_STOREFRONT_ACCESS_TOKEN (Storefront API Access Token)
 * - SHOPIFY_API_VERSION (default 2024-07)
 */

const domain = import.meta.env.SHOPIFY_STORE_DOMAIN || 'vinsho-official.myshopify.com';
const accessToken = import.meta.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const apiVersion = import.meta.env.SHOPIFY_API_VERSION || '2024-07';

const shopifyUrl = `https://${domain}/api/${apiVersion}/graphql.json`;

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    product: {
      title: string;
      handle: string;
      images?: {
        edges: Array<{ node: { url: string; altText?: string } }>;
      };
    };
    price: {
      amount: string;
      currencyCode: string;
    };
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: ShopifyCartLine[];
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
}

export async function shopifyFetch<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
  if (!accessToken) {
    console.warn('Shopify Storefront Access Token is not set. Operating in fallback mode.');
    return {} as T;
  }

  const response = await fetch(shopifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': accessToken
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(`Shopify API Error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

const CART_FRAGMENT = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  lines(first: 50) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price { amount currencyCode }
            product {
              title
              handle
              images(first: 1) {
                edges { node { url altText } }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Creates a new Cart in Shopify Storefront API.
 */
export async function createShopifyCart(lines: Array<{ merchandiseId: string; quantity: number }>): Promise<ShopifyCart | null> {
  const query = `
    mutation createCart($cartInput: CartInput!) {
      cartCreate(input: $cartInput) {
        cart {
          ${CART_FRAGMENT}
        }
      }
    }
  `;

  try {
    const data = await shopifyFetch(query, { cartInput: { lines } });
    if (data?.cartCreate?.cart) {
      return formatCartResponse(data.cartCreate.cart);
    }
  } catch (err) {
    console.error('Failed to create Shopify cart:', err);
  }
  return null;
}

/**
 * Adds lines to an existing Shopify Cart.
 */
export async function addLinesToShopifyCart(cartId: string, lines: Array<{ merchandiseId: string; quantity: number }>): Promise<ShopifyCart | null> {
  const query = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          ${CART_FRAGMENT}
        }
      }
    }
  `;

  try {
    const data = await shopifyFetch(query, { cartId, lines });
    if (data?.cartLinesAdd?.cart) {
      return formatCartResponse(data.cartLinesAdd.cart);
    }
  } catch (err) {
    console.error('Failed to add lines to Shopify cart:', err);
  }
  return null;
}

/**
 * Updates quantities of lines in a Shopify Cart.
 */
export async function updateShopifyCartLines(cartId: string, lines: Array<{ id: string; quantity: number }>): Promise<ShopifyCart | null> {
  const query = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          ${CART_FRAGMENT}
        }
      }
    }
  `;

  try {
    const data = await shopifyFetch(query, { cartId, lines });
    if (data?.cartLinesUpdate?.cart) {
      return formatCartResponse(data.cartLinesUpdate.cart);
    }
  } catch (err) {
    console.error('Failed to update Shopify cart lines:', err);
  }
  return null;
}

/**
 * Removes lines from a Shopify Cart.
 */
export async function removeShopifyCartLines(cartId: string, lineIds: string[]): Promise<ShopifyCart | null> {
  const query = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          ${CART_FRAGMENT}
        }
      }
    }
  `;

  try {
    const data = await shopifyFetch(query, { cartId, lineIds });
    if (data?.cartLinesRemove?.cart) {
      return formatCartResponse(data.cartLinesRemove.cart);
    }
  } catch (err) {
    console.error('Failed to remove Shopify cart lines:', err);
  }
  return null;
}

/**
 * Fetches an existing Cart by Cart ID.
 */
export async function getShopifyCart(cartId: string): Promise<ShopifyCart | null> {
  const query = `
    query getCart($cartId: ID!) {
      cart(id: $cartId) {
        ${CART_FRAGMENT}
      }
    }
  `;

  try {
    const data = await shopifyFetch(query, { cartId });
    if (data?.cart) {
      return formatCartResponse(data.cart);
    }
  } catch (err) {
    console.error('Failed to fetch Shopify cart:', err);
  }
  return null;
}

function formatCartResponse(c: any): ShopifyCart {
  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity || 0,
    cost: c.cost || {
      subtotalAmount: { amount: '0', currencyCode: 'INR' },
      totalAmount: { amount: '0', currencyCode: 'INR' }
    },
    lines: (c.lines?.edges || []).map((e: any) => e.node)
  };
}
