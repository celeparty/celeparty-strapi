const path = require('path');

function getTicketStatus(eventDate) {
  const today = new Date();
  const event = new Date(eventDate);
  today.setHours(0,0,0,0);
  event.setHours(0,0,0,0);
  return today <= event ? 'active' : 'not active';
}

module.exports = {
  async afterCreate(event) {
    const { result } = event;
    if (result.event_type === 'Ticket' && result.email) {
      try {
        // Lazy load the PDF generator to avoid module resolution issues
        const generatorPath = path.resolve(__dirname, '../../transaction-ticket/utils/generateProfessionalTicketPDF.js');
        const { generateProfessionalTicketPDF } = require(generatorPath);
        const baseUrl = process.env.FRONT_URL+'/qr';
        const params = new URLSearchParams({
          order_id: result.order_id,
          event_date: result.event_date,
          customer_name: result.customer_name,
          email: result.email,
          event_type: result.event_type,
          variant: result.variant,
          quantity: result.quantity,
        }).toString();
        const qrUrl = `${baseUrl}?${params}`;
        // Generate PDF with QR code
        const status = getTicketStatus(result.event_date);
        const pdfBuffer = await generateProfessionalTicketPDF({
          transaction: result,
          ticketDetail: {
            recipient_name: result.customer_name,
            recipient_email: result.email,
            barcode: result.order_id,
            whatsapp_number: result.telp,
            identity_type: 'KTP',
            identity_number: '-'
          },
          qrUrl: qrUrl,
          status: status
        });
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
