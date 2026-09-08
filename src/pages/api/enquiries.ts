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
      name, phone, email, message, company, subject, productSlug, collectionKey, subcategoryKey,
      source, website_url, dpdp_consent
    } = body;

    // 1. Honeypot Spam Filter Check
    if (website_url && website_url.trim() !== '') {
      console.warn(`[SPAM DETECTED] Honeypot field populated by IP ${clientIp}`);
      return new Response(JSON.stringify({ success: true, message: 'Message sent successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Submission Rate Limiting per IP & Contact (10 minutes window)
    const now = Date.now();
    const cleanPhone = (phone || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const rateIdentifier = `${clientIp}_${cleanPhone || cleanEmail}`;
    const windowMs = 10 * 60 * 1000;
    const maxSubmissions = 3;

    const rateRow = db.prepare('SELECT * FROM enquiry_rate_limits WHERE identifier = ?').get(rateIdentifier) as any;
    if (rateRow && now - rateRow.first_attempt_at < windowMs && rateRow.attempts >= maxSubmissions) {
      return new Response(JSON.stringify({
        error: 'Too many submissions. Please wait 10 minutes before submitting again.'
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
    const cleanName = (name || '').trim();
    const cleanSubject = (subject || '').trim();
    const cleanCompany = (company || '').trim();
    const cleanMessage = (message || '').trim();

    if (!cleanName) {
      return new Response(JSON.stringify({ error: 'Name is mandatory.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!cleanPhone && !cleanEmail) {
      return new Response(JSON.stringify({ error: 'Phone number or Email address is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Customer Deduplication (Phone first, then Email)
    const consentTime = new Date().toISOString();
    const consentText = dpdp_consent ? 'Customer service & enquiry under DPDP Act 2023' : 'Implicit submission consent under DPDP Act 2023';

    const { customer } = findOrCreateCustomer({
      name: cleanName,
      phone: cleanPhone || 'Not Provided',
      email: cleanEmail || null,
      source: source || 'Contact Us Page',
      consentAt: consentTime,
      consentPurpose: consentText
    });

    // Format full message text
    let fullMsgParts: string[] = [];
    if (cleanSubject) fullMsgParts.push(`Subject: ${cleanSubject}`);
    if (cleanCompany) fullMsgParts.push(`Company: ${cleanCompany}`);
    if (cleanMessage) fullMsgParts.push(cleanMessage);
    const finalMessage = fullMsgParts.join('\n\n');

    // Resolve Product ID from Slug if provided
    let productId: number | null = null;
    let productName = productSlug || (cleanSubject ? `Subject: ${cleanSubject}` : 'General Inquiry');
    if (productSlug) {
      const pRow = db.prepare('SELECT id, name FROM products WHERE slug = ?').get(productSlug) as any;
      if (pRow) {
        productId = pRow.id;
        productName = pRow.name;
      }
    }

    // 5. Create Enquiry Record
    const enquiryRes = db.prepare(`
      INSERT INTO enquiries (
        customer_id, product_id, name, phone, email, message, source, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)
    `).run(
      customer.id,
      productId,
      cleanName,
      cleanPhone || 'Not Provided',
      cleanEmail || null,
      finalMessage,
      source || 'Contact Us Page',
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
      summary: `Contact form submitted by ${cleanName} (${cleanEmail}) - Subject: ${cleanSubject || 'General'}`,
      meta: { customerId: customer.id, source, company: cleanCompany, subject: cleanSubject, ip: clientIp }
    });

    // 7. Log Notification Event
    logNotification({
      channel: 'WHATSAPP',
      template: 'NEW_ENQUIRY_STAFF',
      recipient: content.brand.phone,
      entityType: 'enquiry',
      entityId: enquiryId
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Thank you! Your message has been received. Our team will get back to you shortly.',
      enquiryId,
      customerId: customer.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Enquiry Submission Error:', err);
    return new Response(JSON.stringify({ error: 'Server error processing enquiry. Please try again later.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
