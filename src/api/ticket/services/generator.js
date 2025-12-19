'use strict';

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = ({ strapi }) => ({
  /**
   * Main function to generate tickets from a successful transaction.
   * @param {object} transaction - The transaction-ticket entity.
   */
  async generateFromTransaction(transaction) {
    strapi.log.info(`Starting ticket generation for transaction ${transaction.order_id}`);

    const { product, recipients } = await strapi.entityService.findOne('api::transaction-ticket.transaction-ticket', transaction.id, {
        populate: ['product', 'user'],
      });
  
      if (!product) {
        throw new Error(`Transaction ${transaction.id} does not have a related product.`);
      }
  
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new Error(`Transaction ${transaction.id} has no recipients.`);
      }

    for (const recipient of recipients) {
      await this.generateSingleTicket(transaction, product, recipient);
    }
  },

  /**
   * Generates a single ticket, creates the PDF, and sends the email.
   * @param {object} transaction - The transaction-ticket entity.
   * @param {object} product - The product entity.
   * @param {object} recipient - The recipient information object.
   */
  async generateSingleTicket(transaction, product, recipient) {
    // 1. Generate unique ticket code
    const ticketCode = `CTix-${product.id}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-ticket?code=${ticketCode}`;

    // 2. Create the ticket-detail entity
    const ticketDetail = await strapi.entityService.create('api::ticket-detail.ticket-detail', {
      data: {
        ticket_code: ticketCode,
        barcode: verificationUrl,
        product: product.id,
        transaction_ticket: transaction.id,
        user: transaction.user ? transaction.user.id : null, // Assuming user is populated
        recipient_name: recipient.name,
        recipient_email: recipient.email,
        whatsapp_number: recipient.whatsapp,
        identity_type: recipient.identity_type,
        identity_number: recipient.identity_number,
        status: 'active',
        payment_status: 'paid',
        buyer_name: transaction.customer_name,
        buyer_email: transaction.customer_mail,
        buyer_phone: transaction.telp,
        publishedAt: new Date(),
      },
    });

    strapi.log.info(`Created ticket-detail ${ticketDetail.id} with code ${ticketCode}`);

    // 3. Generate PDF
    const pdfBuffer = await this.generatePdf(ticketDetail, transaction, product);

    // 4. Send email
    await this.sendTicketEmail(recipient.email, product.title, pdfBuffer, ticketCode);
  },

  /**
   * Generates the e-ticket PDF.
   * @param {object} ticketDetail - The ticket-detail entity.
   * @param {object} transaction - The transaction-ticket entity.
   * @param {object} product - The product entity.
   * @returns {Promise<Buffer>} - The PDF buffer.
   */
  async generatePdf(ticketDetail, transaction, product) {
    const qrCodeImage = await QRCode.toDataURL(ticketDetail.barcode, { width: 200 });

    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // --- PDF Design ---
      // Header
      doc.fontSize(25).font('Helvetica-Bold').text('E-TICKET ACARA', { align: 'center' });
      doc.moveDown();

      // Event Details
      doc.fontSize(20).text(product.title, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Diselenggarakan oleh Celeparty.com`, { align: 'center' });
      doc.moveDown(2);

      // Ticket Code
      doc.fontSize(16).font('Helvetica-Bold').text('KODE TIKET ANDA:', { align: 'left' });
      doc.fontSize(20).fillColor('red').text(ticketDetail.ticket_code, { align: 'left' });
      doc.moveDown(2);

      // Barcode
      doc.image(qrCodeImage, {
        fit: [200, 200],
        align: 'center',
      });
      doc.moveDown();
      doc.fillColor('black').font('Helvetica').fontSize(10).text('Scan QR code ini atau tunjukkan kode tiket kepada panitia di lokasi acara.', { align: 'center' });
      doc.moveDown(2);

      // Recipient Details
      doc.fontSize(14).font('Helvetica-Bold').text('Data Pemegang Tiket');
      doc.fontSize(12).font('Helvetica').text(`Nama: ${ticketDetail.recipient_name}`);
      doc.text(`Email: ${ticketDetail.recipient_email}`);
      doc.text(`No. Whatsapp: ${ticketDetail.whatsapp_number}`);
      doc.text(`Identitas: ${ticketDetail.identity_type} - ${ticketDetail.identity_number}`);
      doc.moveDown();

      // Transaction Details
      doc.fontSize(14).font('Helvetica-Bold').text('Detail Transaksi');
      doc.fontSize(12).font('Helvetica').text(`ID Pesanan: ${transaction.order_id}`);
      doc.text(`Tanggal Pesan: ${new Date(transaction.createdAt).toLocaleString('id-ID')}`);
      doc.text(`Total Harga: Rp ${transaction.total_price}`);
      doc.moveDown();

      // Footer
      doc.fontSize(10).text('Terima kasih telah melakukan pemesanan melalui Celeparty.com. Tiket ini adalah bukti sah untuk masuk ke acara.', { align: 'center' });
      doc.end();
    });
  },

  /**
   * Sends the email with the ticket.
   * @param {string} recipientEmail - The email address of the recipient.
   * @param {string} eventName - The name of the event/product.
   * @param {Buffer} pdfBuffer - The generated PDF buffer.
   * @param {string} ticketCode - The unique ticket code.
   */
  async sendTicketEmail(recipientEmail, eventName, pdfBuffer, ticketCode) {
    const emailSubject = `e-Ticket Anda untuk Acara ${eventName}`;
    const emailHtml = `
      <p>Yth. Bapak/Ibu,</p>
      <p>Terima kasih telah menggunakan Celeparty.com.</p>
      <p>Bersama ini kami lampirkan e-Ticket Anda untuk acara <b>${eventName}</b>. Mohon simpan email ini dan tunjukkan e-Ticket terlampir kepada panitia di lokasi acara untuk proses verifikasi.</p>
      <p>Kode tiket Anda adalah: <b>${ticketCode}</b></p>
      <p>Tiket ini adalah alat tukar yang sah. Jangan bagikan kode tiket atau QR code kepada siapa pun untuk menghindari penyalahgunaan.</p>
      <p>Hormat kami,</p>
      <p><b>Tim Celeparty.com</b></p>
    `;

    try {
      await strapi.plugin('email').service('email').send({
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
        attachments: [
          {
            filename: `e-ticket-${ticketCode}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      strapi.log.info(`Successfully sent e-ticket to ${recipientEmail}`);
    } catch (err) {
      strapi.log.error(`Failed to send email to ${recipientEmail}`, err);
      throw new Error(`Failed to send email to ${recipientEmail}`);
    }
  },
});
