'use strict';

/**
 * transaction-ticket controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');
const crypto = require('crypto');

function getTicketStatus(eventDate) {
  const today = new Date();
  const event = new Date(eventDate);
  today.setHours(0,0,0,0);
  event.setHours(0,0,0,0);
  return today <= event ? 'active' : 'not active';
}

function generateUniqueBarcode() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

async function generateTicketPDF({ url, transaction, status, recipientName, recipientEmail, barcode }) {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(url);
      // Extract base64 from data URL
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      // Create PDF
      const doc = new PDFDocument();
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.fontSize(18).text('E-Ticket Celeparty', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Order ID: ${transaction.order_id}`);
      doc.text(`Nama Pemesan: ${transaction.customer_name}`);
      doc.text(`Email: ${transaction.customer_mail}`);
      doc.text(`Nama Penerima: ${recipientName}`);
      doc.text(`Email Penerima: ${recipientEmail}`);
      doc.text(`Barcode: ${barcode}`);
      doc.text(`Nama Event: ${transaction.product_name || 'N/A'}`);
      doc.text(`Event Type: Ticket`);
      doc.text(`Tanggal Acara: ${transaction.event_date}`);
      doc.text(`Varian: ${transaction.variant}`);
      doc.text(`Status Tiket: ${status}`);
      doc.moveDown();
      doc.text('Scan QR code di bawah ini untuk verifikasi tiket:', { align: 'center' });
      doc.moveDown();
      // Insert QR code image
      doc.image(Buffer.from(qrBase64, 'base64'), {
        fit: [200, 200],
        align: 'center',
        valign: 'center',
      });
      doc.text('Harap tidak membagikan barcode ini ke pihak lain.', { align: 'center' });
      doc.text('Setiap tiket memiliki barcode unik.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = createCoreController('api::transaction-ticket.transaction-ticket', ({ strapi }) => ({
  // Custom method for sending tickets to multiple recipients
  async sendTickets(ctx) {
    try {
      const { transactionId, recipients, password } = ctx.request.body;

      // Verify vendor password (simplified - in production should use proper auth)
      const vendorId = ctx.state.user?.id;
      if (!vendorId) {
        return ctx.unauthorized('Vendor authentication required');
      }

      // Get transaction
      const transaction = await strapi.entityService.findOne('api::transaction-ticket.transaction-ticket', transactionId, {
        populate: ['ticket_details']
      });

      if (!transaction) {
        return ctx.notFound('Transaction not found');
      }

      if (transaction.vendor_id !== vendorId) {
        return ctx.forbidden('Access denied');
      }

      // Create new transaction for sent tickets
      const sentTransaction = await strapi.entityService.create('api::transaction-ticket.transaction-ticket', {
        data: {
          product_name: transaction.product_name,
          price: transaction.price,
          quantity: recipients.length.toString(),
          variant: transaction.variant,
          customer_name: transaction.customer_name,
          telp: transaction.telp,
          total_price: (parseFloat(transaction.price) * recipients.length).toString(),
          payment_status: 'bypass', // Special status for sent tickets
          event_date: transaction.event_date,
          event_type: transaction.event_type,
          note: `Tickets sent to ${recipients.length} recipients`,
          order_id: `SENT-${Date.now()}`,
          customer_mail: transaction.customer_mail,
          verification: false,
          vendor_id: transaction.vendor_id,
          recipients: recipients,
          publishedAt: new Date()
        }
      });

      // Generate individual ticket details for each recipient
      const ticketDetails = [];
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const barcode = generateUniqueBarcode();

        const ticketDetail = await strapi.entityService.create('api::ticket-detail.ticket-detail', {
          data: {
            recipient_name: recipient.name,
            identity_type: recipient.identity_type || 'KTP',
            identity_number: recipient.identity_number || '',
            whatsapp_number: recipient.whatsapp_number || '',
            recipient_email: recipient.email,
            barcode: barcode,
            status: 'active',
            transaction_ticket: sentTransaction.id,
            publishedAt: new Date()
          }
        });
        ticketDetails.push(ticketDetail);
      }

      // Send emails to all recipients
      for (const ticketDetail of ticketDetails) {
        const baseUrl = process.env.FRONT_URL + '/qr';
        const params = new URLSearchParams({
          barcode: ticketDetail.barcode,
          event_date: transaction.event_date,
          customer_name: transaction.customer_name,
          email: transaction.customer_mail,
          event_type: transaction.event_type,
        }).toString();
        const qrUrl = `${baseUrl}?${params}`;

        const status = getTicketStatus(transaction.event_date);
        const pdfBuffer = await generateTicketPDF({
          url: qrUrl,
          transaction: transaction,
          status,
          recipientName: ticketDetail.recipient_name,
          recipientEmail: ticketDetail.recipient_email,
          barcode: ticketDetail.barcode
        });

        const emailBody = `
Halo ${ticketDetail.recipient_name},

Anda telah menerima tiket untuk acara ${transaction.product_name}.

Detail Tiket:
- Nama Event: ${transaction.product_name}
- Tanggal Acara: ${transaction.event_date}
- Varian: ${transaction.variant}
- Barcode: ${ticketDetail.barcode}
- Status Tiket: ${status}

Tiket Anda terlampir dalam bentuk PDF dengan QR code unik.

Terima kasih telah menggunakan Celeparty!`;

        await strapi.plugin('email').service('email').send({
          to: ticketDetail.recipient_email,
          subject: `Tiket Anda untuk ${transaction.product_name}`,
          text: emailBody,
          attachments: [
            {
              filename: `ticket-${transaction.order_id}-${ticketDetail.barcode}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });
      }

      ctx.send({
        message: 'Tickets sent successfully',
        transaction: sentTransaction,
        ticketDetails: ticketDetails
      });

    } catch (error) {
      strapi.log.error('Error sending tickets:', error);
      ctx.internalServerError('Failed to send tickets');
    }
  },

  // Custom method for QR code verification
  async verifyQR(ctx) {
    try {
      const { barcode } = ctx.request.body;

      if (!barcode) {
        return ctx.badRequest('Barcode is required');
      }

      // Find ticket detail by barcode
      const ticketDetail = await strapi.entityService.findMany('api::ticket-detail.ticket-detail', {
        filters: {
          barcode: barcode
        },
        populate: ['transaction_ticket']
      });

      if (ticketDetail.length === 0) {
        return ctx.notFound('Ticket not found');
      }

      const ticket = ticketDetail[0];
      const transaction = ticket.transaction_ticket;

      // Check if ticket is already verified
      if (ticket.status === 'verified') {
        return ctx.send({
          valid: false,
          message: 'Ticket already verified',
          ticket: ticket,
          transaction: transaction
        });
      }

      // Check if event date is valid
      const status = getTicketStatus(transaction.event_date);
      if (status === 'not active') {
        return ctx.send({
          valid: false,
          message: 'Event has passed',
          ticket: ticket,
          transaction: transaction
        });
      }

      // Update ticket status to verified
      await strapi.entityService.update('api::ticket-detail.ticket-detail', ticket.id, {
        data: {
          status: 'verified'
        }
      });

      // Update transaction verification status
      await strapi.entityService.update('api::transaction-ticket.transaction-ticket', transaction.id, {
        data: {
          verification: true
        }
      });

      ctx.send({
        valid: true,
        message: 'Ticket verified successfully',
        ticket: { ...ticket, status: 'verified' },
        transaction: { ...transaction, verification: true }
      });

    } catch (error) {
      strapi.log.error('Error verifying QR code:', error);
      ctx.internalServerError('Failed to verify ticket');
    }
  }
}));
