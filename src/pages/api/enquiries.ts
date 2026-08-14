import type { APIRoute } from 'astro';
import { db } from '../../lib/db.js';
import { findOrCreateCustomer, logCrmActivity } from '../../lib/crm.js';
import { logNotification } from '../../lib/notifications.js';
import content from '../../../vinsho-content.json';

export const POST: APIRoute = async ({ request }) => {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const body = await request.json();

    const {
      name, phone, email, message, productSlug, collectionKey, subcategoryKey,
      source, website_url, dpdp_consent
    } = body;

    // 1. Honeypot Spam Filter Check (§2)
    if (website_url && website_url.trim() !== '') {
      console.warn(`[SPAM DETECTED] Honeypot field populated by IP ${clientIp}`);
      return new Response(JSON.stringify({ success: true, message: 'Enquiry submitted successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Submission Rate Limiting per IP & Phone (§2)
    const now = Date.now();
    const cleanPhone = (phone || '').trim();
    const rateIdentifier = `${clientIp}_${cleanPhone}`;
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxSubmissions = 3;

    const rateRow = db.prepare('SELECT * FROM enquiry_rate_limits WHERE identifier = ?').get(rateIdentifier) as any;
    if (rateRow && now - rateRow.first_attempt_at < windowMs && rateRow.attempts >= maxSubmissions) {
      return new Response(JSON.stringify({
        error: 'Too many enquiry submissions from this connection. Please wait 10 minutes before submitting again.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!rateRow || now - rateRow.first_attempt_at > windowMs) {
      db.prepare(`
        INSERT INTO enquiry_rate_limits (identifier, attempts, first_attempt_at)
        VALUES (?, 1, ?)
        ON CONFLICT(identifier) DO UPDATE SET attempts = 1, first_attempt_at = ?
      `).run(rateIdentifier, now, now);
    } else {
      db.prepare('UPDATE enquiry_rate_limits SET attempts = attempts + 1 WHERE identifier = ?').run(rateIdentifier);
    }

    // 3. Input Validation
    if (!name || !phone) {
      return new Response(JSON.stringify({ error: 'Name and Phone Number are mandatory fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Customer Deduplication (Phone first, then Email) (§1, §2)
    const consentTime = new Date().toISOString();
    const consentText = dpdp_consent ? 'Product quotation and customer service under DPDP Act 2023' : 'Implicit submission consent under DPDP Act 2023';

    const { customer } = findOrCreateCustomer({
      name,
      phone: cleanPhone,
      email: email || null,
      source: source || 'Product Page Enquiry',
      consentAt: consentTime,
      consentPurpose: consentText
    });

    // Resolve Product ID from Slug if provided
    let productId: number | null = null;
    let productName = productSlug || 'General Inquiry';
    if (productSlug) {
      const pRow = db.prepare('SELECT id, name FROM products WHERE slug = ?').get(productSlug) as any;
      if (pRow) {
        productId = pRow.id;
        productName = pRow.name;
      }
    }

    // 5. Create Enquiry Record (§2)
    const enquiryRes = db.prepare(`
      INSERT INTO enquiries (
        customer_id, product_id, name, phone, email, message, source, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)
    `).run(
      customer.id,
      productId,
      name.trim(),
      cleanPhone,
      (email || '').trim().toLowerCase() || null,
      (message || '').trim(),
      source || 'Product Quick View Modal',
      consentTime,
      consentTime
    );

    const enquiryId = enquiryRes.lastInsertRowid as number;

    // 6. Log Activity Audit Timeline
    logCrmActivity({
      entityType: 'enquiry',
      entityId: enquiryId,
      actorId: null,
      type: 'CREATED',
      summary: `Public enquiry submitted by ${name} (${cleanPhone}) for product: ${productName}`,
      meta: { customerId: customer.id, source, ip: clientIp }
    });

    logCrmActivity({
      entityType: 'customer',
      entityId: customer.id,
      actorId: null,
      type: 'ENQUIRY_SUBMITTED',
      summary: `Enquiry #${enquiryId} created for '${productName}'`,
      meta: { enquiryId }
    });

    // 7. Log Notification Event (§9)
    logNotification({
      channel: 'WHATSAPP',
      template: 'NEW_ENQUIRY_STAFF',
      recipient: content.brand.phone,
      entityType: 'enquiry',
      entityId: enquiryId
    });

    // 8. Generate WhatsApp Pre-filled URL (§2)
    const whatsappMsg = encodeURIComponent(`Hi VINSHO, I have submitted an enquiry for "${productName}". My name is ${name.trim()} (${cleanPhone}).`);
    const whatsappUrl = `https://wa.me/${content.brand.whatsapp}?text=${whatsappMsg}`;

    return new Response(JSON.stringify({
      success: true,
      message: 'Thank you! Your enquiry has been received. Our team will get back to you shortly.',
      enquiryId,
      customerId: customer.id,
      whatsappUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Enquiry Submission Error:', err);
    return new Response(JSON.stringify({ error: 'Server error processing enquiry.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
