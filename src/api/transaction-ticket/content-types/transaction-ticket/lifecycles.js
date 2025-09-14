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
      doc.text(`Nama Event: ${transaction.product_name || 'N/A'}`);
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

    const vendorId = result.vendor_id;
    const vendorData = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: {
        documentId: vendorId
      }
    });    
    const userEventTypes = await strapi.entityService.findMany('api::user-event-type.user-event-type', {
      filters: {
        id: 15
      }
    });
    console.log("vendorData", vendorData);
 
    const feeMidtrans = 5000
    const feeCeleparty = userEventTypes.application_fee

    // Check if payment status changed to 'settlement' (primary focus)
    const isSettlement = result.payment_status === 'settlement' || result.payment_status === 'Settlement';
    const wasNotSettlement = state.oldPaymentStatus !== 'settlement' && state.oldPaymentStatus !== 'Settlement';
    
    // Update vendor balance when payment is settled
    if (isSettlement && wasNotSettlement && vendorData.length > 0) {
      try {
        const vendor = vendorData[0];
        const totalPrice = parseFloat(result.total_price) || 0;
        const quantity = parseInt(result.quantity) || 1;
        
        // Calculate fees: feeMidtrans * quantity + (total_price * 2.5%)
        const totalFee = (feeMidtrans * quantity) + (totalPrice * 0.025);
        
        // Calculate update saldo: total_price - totalFee
        const updateSaldo = totalPrice - totalFee;
        
        // Get current saldo_active
        const currentSaldo = parseFloat(vendor.saldo_active || '0');
        
        // Calculate new saldo
        const newSaldo = currentSaldo + updateSaldo;
        
        strapi.log.info(`Updating vendor balance for vendor ${vendorId}:`);
        strapi.log.info(`- Total Price: ${totalPrice}`);
        strapi.log.info(`- Quantity: ${quantity}`);
        strapi.log.info(`- Fee Midtrans: ${feeMidtrans * quantity}`);
        strapi.log.info(`- Fee Celeparty (2.5%): ${totalPrice * 0.025}`);
        strapi.log.info(`- Total Fee: ${totalFee}`);
        strapi.log.info(`- Update Saldo: ${updateSaldo}`);
        strapi.log.info(`- Current Saldo: ${currentSaldo}`);
        strapi.log.info(`- New Saldo: ${newSaldo}`);
        
        // Update vendor saldo_active
        await strapi.query('plugin::users-permissions.user').update({
          where: { id: vendor.id },
          data: { saldo_active: newSaldo.toString() }
        });
        
        strapi.log.info(`Vendor balance updated successfully for vendor ${vendorId}: ${currentSaldo} -> ${newSaldo}`);
        
      } catch (error) {
        strapi.log.error('Error updating vendor balance:', error);
      }
    }

    // Reduce product stock when payment is settled
    if (isSettlement && wasNotSettlement) {
      try {
        // Ambil data produk dari transaksi
        const productName = result.product_name;
        const quantity = parseInt(result.quantity) || 1;
        const variant = result.variant;
        
        // Cari produk berdasarkan nama
        const products = await strapi.entityService.findMany('api::product.product', {
          filters: {
            title: productName
          },
          populate: ['variant']
        });
        
        if (products.length > 0) {
          const product = products[0];
          
          // Update stok di variant yang sesuai
          if (product.variant && product.variant.length > 0) {
            const updatedVariants = product.variant.map(v => {
              if (v.name === variant) {
                const currentQuota = parseInt(v.quota) || 0;
                const newQuota = Math.max(0, currentQuota - quantity);
                return {
                  ...v,
                  quota: newQuota.toString()
                };
              }
              return v;
            });
            
            // Update produk dengan variant yang sudah dikurangi stoknya
            await strapi.entityService.update('api::product.product', product.id, {
              data: {
                variant: updatedVariants
              }
            });
            
            strapi.log.info(`Stock reduced for product ${productName}, variant ${variant}: ${quantity} items`);
          }
        }
      } catch (error) {
        strapi.log.error('Error reducing product stock:', error);
      }
    }
    
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
