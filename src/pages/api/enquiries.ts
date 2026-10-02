import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db.js';
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

    const rateRow = await prisma.enquiry_rate_limits.findUnique({
      where: { identifier: rateIdentifier }
    });

    if (rateRow && (now - Number(rateRow.first_attempt_at)) < windowMs && (rateRow.attempts || 0) >= maxSubmissions) {
      return new Response(JSON.stringify({
        error: 'Too many submissions. Please wait 10 minutes before submitting again.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!rateRow || (now - Number(rateRow.first_attempt_at)) > windowMs) {
      await prisma.enquiry_rate_limits.upsert({
        where: { identifier: rateIdentifier },
        create: {
          identifier: rateIdentifier,
          attempts: 1,
          first_attempt_at: BigInt(now)
        },
        update: {
          attempts: 1,
          first_attempt_at: BigInt(now)
        }
      });
    } else {
      await prisma.enquiry_rate_limits.update({
        where: { identifier: rateIdentifier },
        data: {
          attempts: { increment: 1 }
        }
      });
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
    const consentTime = new Date();
    const consentText = dpdp_consent ? 'Customer service & enquiry under DPDP Act 2023' : 'Implicit submission consent under DPDP Act 2023';

    const { customer } = await findOrCreateCustomer({
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
      const pRow = await prisma.products.findFirst({
        where: { slug: productSlug, deleted_at: null },
        select: { id: true, name: true }
      });
      if (pRow) {
        productId = pRow.id;
        productName = pRow.name;
      }
    }

    // 5. Create Enquiry Record
    const newEnquiry = await prisma.enquiries.create({
      data: {
        customer_id: customer.id,
        product_id: productId,
        name: cleanName,
        phone: cleanPhone || 'Not Provided',
        email: cleanEmail || null,
        message: finalMessage,
        source: source || 'Contact Us Page',
        status: 'New',
        created_at: consentTime,
        updated_at: consentTime
      }
    });

    const enquiryId = newEnquiry.id;

    // 6. Log Activity Audit Timeline
    await logCrmActivity({
      entityType: 'enquiry',
      entityId: enquiryId,
      actorId: null,
      type: 'CREATED',
      summary: `Contact form submitted by ${cleanName} (${cleanEmail}) - Subject: ${cleanSubject || 'General'}`,
      meta: { customerId: customer.id, source, company: cleanCompany, subject: cleanSubject, ip: clientIp }
    });

    // 7. Log Notification Event
    await logNotification({
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
