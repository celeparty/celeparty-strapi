const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

function getTicketStatus(eventDate) {
  const today = new Date();
  const event = new Date(eventDate);
  today.setHours(0,0,0,0);
  event.setHours(0,0,0,0);
  return today <= event ? 'active' : 'not active';
}

async function generateTicketPDF({ url, transaction, status }) {
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
      doc.text(`Email: ${transaction.email}`);
      doc.text(`Event Type: ${transaction.event_type}`);
      doc.text(`Tanggal Acara: ${transaction.event_date}`);
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
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  async afterCreate(event) {
    const { result } = event;
    if (result.event_type === 'Ticket' && result.email) {
      try {
        // Build QR code URL
        const baseUrl = 'http://localhost:3000/qr';
        const params = new URLSearchParams({
          order_id: result.order_id,
          event_date: result.event_date,
          customer_name: result.customer_name,
          email: result.email,
          event_type: result.event_type,
        }).toString();
        const qrUrl = `${baseUrl}?${params}`;
        // Determine ticket status
        const status = getTicketStatus(result.event_date);
        // Generate PDF with QR code
        const pdfBuffer = await generateTicketPDF({ url: qrUrl, transaction: result, status });
        // Build email body (plain text fallback)
        const emailBody = `
Halo,\n\nTransaksi Anda telah berhasil. Berikut detail transaksi Anda:\n\n- Status Pembayaran: ${result.payment_status}\n- Varian: ${result.variant}\n- Jumlah: ${result.quantity}\n- Tanggal Acara: ${result.event_date}\n- Nama Pemesan: ${result.customer_name}\n- Telepon: ${result.telp}\n- Catatan: ${result.note}\n- Order ID: ${result.order_id}\n- Email: ${result.email}\n- Event Type: ${result.event_type}\n- Status Tiket: ${status}\n\nTiket Anda terlampir dalam bentuk PDF dengan QR code.\n\nTerima kasih telah menggunakan Celeparty!`;
        await strapi.plugin('email').service('email').send({
          to: result.email,
          subject: 'Tiket Anda Berhasil Dipesan',
          text: emailBody,
          attachments: [
            {
              filename: `ticket-${result.order_id}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });
        strapi.log.info(`Notifikasi email tiket (dengan PDF QR) berhasil dikirim ke ${result.email}`);
      } catch (err) {
        strapi.log.error('Gagal mengirim email tiket dengan PDF QR:', err);
      }
    }
  },
};
