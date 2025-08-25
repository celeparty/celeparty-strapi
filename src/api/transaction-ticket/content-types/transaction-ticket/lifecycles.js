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
      doc.text(`Email: ${transaction.customer_mail}`);
      doc.text(`Event Type: Ticket`);
      doc.text(`Tanggal Acara: ${transaction.event_date}`);
      doc.text(`Varian: ${transaction.variant}`);
      doc.text(`Quantity: ${transaction.quantity}`);
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
      doc.text('Satu barcode mewakili seluruh jumlah tiket dalam transaksi Anda.', { align: 'center' });


      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  async afterCreate(event) {
    // Tidak mengirim email saat data pertama kali dibuat
    // Email hanya akan dikirim saat payment_status berubah menjadi 'settlement'
    strapi.log.info(`Data transaction-ticket baru dibuat dengan order_id: ${event.result.order_id}`);
  },

  async beforeUpdate(event) {
    const { params, state } = event;
    console.log('=== BEFORE UPDATE ===');
    console.log('Params:', params);
    console.log('State:', state);
    
    // Get the current record to store old payment status
    if (params.where && params.where.id) {
      try {
        const currentRecord = await strapi.entityService.findOne('api::transaction-ticket.transaction-ticket', params.where.id);
        state.oldPaymentStatus = currentRecord.payment_status;
        console.log('Old payment status from database:', currentRecord.payment_status);
      } catch (error) {
        console.log('Error getting old payment status:', error);
      }
    }
  },

  async afterUpdate(event) {
    const { result, state } = event;
    console.log('=== AFTER UPDATE ===');
    console.log('Result:', result);
    console.log('State:', state);
    console.log('Event type:', result.event_type || "Ticket");
    console.log('Customer mail:', result.customer_mail);
    console.log('Payment status:', result.payment_status);
    console.log('Old payment status:', state.oldPaymentStatus);
    
    // Check if payment status changed to 'settlement' (primary focus)
    const isSettlement = result.payment_status === 'settlement' || result.payment_status === 'Settlement';
    const wasNotSettlement = state.oldPaymentStatus !== 'settlement' && state.oldPaymentStatus !== 'Settlement';
    
    console.log('Is settlement:', isSettlement);
    console.log('Was not settlement:', wasNotSettlement);
    console.log('Has customer mail:', !!result.customer_mail);
    
    const shouldSendEmail = result.customer_mail && isSettlement && wasNotSettlement;
    
    console.log('Should send email:', shouldSendEmail);
    
    if (shouldSendEmail) {
      
      try {
        // Build QR code URL
        const baseUrl = process.env.FRONT_URL+'/qr';
        const params = new URLSearchParams({
          order_id: result.order_id,
          event_date: result.event_date,
          customer_name: result.customer_name,
          email: result.customer_mail,
          event_type: result.event_type,
        }).toString();
        const qrUrl = `${baseUrl}?${params}`;
        
        // Determine ticket status
        const status = getTicketStatus(result.event_date);
        
        // Generate PDF with QR code
        const pdfBuffer = await generateTicketPDF({ url: qrUrl, transaction: result, status });
        
        // Build email body for payment success
        const emailBody = `
Halo,\n\nTransaksi Anda telah berhasil. Berikut detail transaksi Anda:\n\n- Status Pembayaran: ${result.payment_status}\n- Varian: ${result.variant}\n- Jumlah: ${result.quantity}\n- Tanggal Acara: ${result.event_date}\n- Nama Pemesan: ${result.customer_name}\n- Telepon: ${result.telp}\n- Catatan: ${result.note}\n- Order ID: ${result.order_id}\n- Email: ${result.customer_mail}\n- Event Type: ${result.event_type}\n- Status Tiket: ${status}\n\nTiket Anda terlampir dalam bentuk PDF dengan QR code.\n\nTerima kasih telah menggunakan Celeparty!`;
        
        // Determine email subject based on payment status
        const emailSubject = (result.payment_status === 'settlement' || result.payment_status === 'Settlement')
          ? 'Pembayaran Settlement - Tiket Anda Siap!' 
          : 'Pembayaran Berhasil - Tiket Anda Siap!';
        
        await strapi.plugin('email').service('email').send({
          to: result.customer_mail,
          subject: emailSubject,
          text: emailBody,
          attachments: [
            {
              filename: `ticket-${result.order_id}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });
        
        strapi.log.info(`Email konfirmasi pembayaran (${result.payment_status}) berhasil dikirim ke ${result.customer_mail} untuk order ${result.order_id}`);
      } catch (err) {
        strapi.log.error('Gagal mengirim email konfirmasi pembayaran:', err);
      }
    }
  },
};
