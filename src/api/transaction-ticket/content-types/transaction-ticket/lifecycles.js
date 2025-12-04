const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

async function generateInvoicePDF({ transaction, ticketDetails }) {
  return new Promise(async (resolve, reject) => {
    try {
      const logoPath = path.resolve(__dirname, '../../../../public/images/logo-white.png');
      const logoExists = fs.existsSync(logoPath);

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header with colored background and logo
      doc.rect(0, 0, doc.page.width, 70).fill('#3E2882'); // Use c-blue from tailwind.config.js
      if (logoExists) {
        doc.image(logoPath, 50, 15, { width: 100 });
      }
      doc.fillColor('white').fontSize(20).text('INVOICE', 160, 25, { align: 'left' });
      doc.fillColor('white').fontSize(14).text('Celeparty Event Management', 160, 50, { align: 'left' });

      doc.moveDown(3);

      // Invoice details
      doc.fillColor('black').fontSize(12);
      doc.text(`Invoice Number: INV-${transaction.order_id}`);
      doc.text(`Order ID: ${transaction.order_id}`);
      doc.text(`Date: ${new Date().toLocaleDateString('id-ID')}`);

      doc.moveDown();

      // Customer details
      doc.fontSize(14).text('Bill To:', { underline: true });
      doc.fontSize(12);
      doc.text(`Name: ${transaction.customer_name}`);
      doc.text(`Email: ${transaction.customer_mail}`);
      doc.text(`Phone: ${transaction.telp}`);

      doc.moveDown();

      // Event details
      doc.fontSize(14).text('Event Details:', { underline: true });
      doc.fontSize(12);
      doc.text(`Event Name: ${transaction.product_name}`);
      doc.text(`Event Date: ${transaction.event_date}`);
      doc.text(`Event Type: ${transaction.event_type}`);
      doc.text(`Variant: ${transaction.variant}`);

      doc.moveDown();

      // Items table
      doc.fontSize(14).text('Items:', { underline: true });
      doc.moveDown(0.5);

      // Table headers
      const tableTop = doc.y;
      doc.fontSize(10);
      doc.text('No.', 50, tableTop);
      doc.text('Recipient Name', 80, tableTop);
      doc.text('Email', 200, tableTop);
      doc.text('Barcode', 350, tableTop);
      doc.text('Price', 480, tableTop);

      // Draw line
      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();

      // Table rows
      let yPosition = doc.y + 15;
      ticketDetails.forEach((detail, index) => {
        doc.fontSize(9);
        doc.text(`${index + 1}`, 50, yPosition);
        doc.text(detail.recipient_name, 80, yPosition);
        doc.text(detail.recipient_email, 200, yPosition);
        doc.text(detail.barcode, 350, yPosition);
        doc.text(`Rp ${parseInt(transaction.price).toLocaleString('id-ID')}`, 480, yPosition);
        yPosition += 20;
      });

      // Draw line after items
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;

      // Total
      doc.fontSize(12);
      doc.text(`Total Quantity: ${transaction.quantity}`, 350, yPosition);
      doc.text(`Total Amount: Rp ${parseInt(transaction.total_price).toLocaleString('id-ID')}`, 350, yPosition + 20);

      // Payment status
      doc.moveDown(2);
      doc.fontSize(12);
      doc.text(`Payment Status: ${transaction.payment_status === 'settlement' ? 'Paid' : 'Pending'}`, { align: 'right' });

      // Footer
      const footerY = doc.page.height - 50;
      doc.rect(0, footerY - 10, doc.page.width, 50).fill('#3E2882');
      doc.fillColor('white').fontSize(10).text(`Tanggal dibuat: ${new Date().toLocaleDateString('id-ID')}`, 50, footerY, { align: 'left' });
      doc.fillColor('white').fontSize(10).text('Contact: support@celeparty.com | IG: @celeparty_official | FB: Celeparty', -50, footerY, { align: 'right' });

      // Footer text - thank you note (no longer needed due to custom footer design)
      // doc.moveDown(2);
      // doc.fontSize(10).text('Thank you for choosing Celeparty!', { align: 'center' });
      // doc.text('For any questions, please contact our support team.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

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

    // Generate individual ticket details if quantity > 1 and payment is settled
    if (isSettlement && wasNotSettlement && parseInt(result.quantity) > 1) {
      try {
        const quantity = parseInt(result.quantity);
        const ticketDetails = [];

        // Check if ticket details already exist
        const existingDetails = await strapi.entityService.findMany('api::ticket-detail.ticket-detail', {
          filters: {
            transaction_ticket: result.id
          }
        });

        if (existingDetails.length === 0) {
        // Generate individual ticket details
          for (let i = 0; i < quantity; i++) {
            const barcode = generateUniqueBarcode();
            // Use recipient data if available, otherwise default to customer data
            const recipientData = result.recipients && result.recipients[i] ? result.recipients[i] : {
              name: result.customer_name,
              email: result.customer_mail
            };

            const ticketDetail = await strapi.entityService.create('api::ticket-detail.ticket-detail', {
              data: {
                recipient_name: recipientData.name,
                identity_type: recipientData.identity_type || 'KTP',
                identity_number: recipientData.identity_number || '',
                whatsapp_number: recipientData.whatsapp_number || '',
                recipient_email: recipientData.email,
                barcode: barcode,
                status: 'active',
                transaction_ticket: result.id,
                publishedAt: new Date()
              }
            });
            ticketDetails.push(ticketDetail);
          }
          strapi.log.info(`Generated ${quantity} individual ticket details for transaction ${result.order_id}`);
        }
      } catch (error) {
        strapi.log.error('Error generating individual ticket details:', error);
      }
    }
    
    console.log('=== STOCK REDUCTION CHECK ===');
    console.log('Current payment status:', result.payment_status);
    console.log('Old payment status:', state.oldPaymentStatus);
    console.log('Is settlement:', isSettlement);
    console.log('Was not settlement:', wasNotSettlement);
    console.log('Should reduce stock:', isSettlement && wasNotSettlement);
    
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
        console.log('=== REDUCING STOCK ===');
        // Ambil data produk dari transaksi
        const productName = result.product_name;
        const quantity = parseInt(result.quantity) || 1;
        const variant = result.variant;
        
        console.log('Product name:', productName);
        console.log('Quantity to reduce:', quantity);
        console.log('Variant:', variant);
        
        // Cari produk berdasarkan nama
        const products = await strapi.entityService.findMany('api::product.product', {
          filters: {
            title: productName
          },
          populate: ['variant']
        });
        
        console.log('Found products:', products.length);
        
        if (products.length > 0) {
          const product = products[0];
          console.log('Product ID:', product.id);
          console.log('Product documentId:', product.documentId);
          console.log('Product variants:', product.variant);
          
          // Update stok di variant yang sesuai
          if (product.variant && product.variant.length > 0) {
            let stockReduced = false;
            const updatedVariants = product.variant.map(v => {
              console.log('Checking variant:', v.name, 'vs', variant);
              if (v.name === variant) {
                const currentQuota = parseInt(v.quota) || 0;
                const newQuota = Math.max(0, currentQuota - quantity);
                console.log(`Reducing stock: ${currentQuota} -> ${newQuota}`);
                stockReduced = true;
                return {
                  ...v,
                  quota: newQuota.toString()
                };
              }
              return v;
            });
            
            if (stockReduced) {
              console.log('=== UPDATING STOCK AND PUBLISHING PRODUCT ===');
              console.log('Product ID:', product.id);
              console.log('Product documentId:', product.documentId);
              console.log('Current product publishedAt before update:', product.publishedAt);
              
              try {
                // STEP 1: Update stok variant dulu (ini akan masuk ke draft)
                console.log('=== UPDATING STOCK (DRAFT) ===');
                const updateResult = await strapi.entityService.update('api::product.product', product.id, {
                  data: {
                    variant: updatedVariants
                  }
                });
                
                console.log('Stock update result:', !!updateResult);
                console.log('Updated variants count:', updateResult?.variant?.length);
                
                // STEP 2: Publish perubahan menggunakan Document Service (Strapi 5.x)
                console.log('=== PUBLISHING CHANGES ===');
                console.log('Using documentId for publish:', product.documentId);
                
                const publishResult = await strapi.documents('api::product.product').publish({
                  documentId: product.documentId
                });
                
                console.log('=== PUBLISH RESULT ===');
                console.log('Publish successful:', !!publishResult);
                console.log('Published document ID:', publishResult?.documentId);
                
                // STEP 3: Verifikasi bahwa perubahan benar-benar ter-publish
                const verificationResult = await strapi.entityService.findOne('api::product.product', product.id, {
                  populate: ['variant']
                });
                
                console.log('=== VERIFICATION ===');
                console.log('Verified publishedAt:', verificationResult?.publishedAt);
                console.log('Verified variants count:', verificationResult?.variant?.length);
                
                // Cari variant yang di-update untuk verifikasi
                const updatedVariant = verificationResult?.variant?.find(v => v.name === variant);
                if (updatedVariant) {
                  console.log(`Verified ${variant} quota:`, updatedVariant.quota);
                }
                
                if (verificationResult?.publishedAt && updatedVariant) {
                  strapi.log.info(`✅ SUCCESS: Stock reduced for product ${productName}, variant ${variant}: ${quantity} items and changes published to live version`);
                } else {
                  strapi.log.error(`❌ FAILED: Product ${productName} stock updated but changes not published to live version`);
                }
                
              } catch (updateError) {
                console.log('=== UPDATE/PUBLISH ERROR ===');
                console.log('Error:', updateError);
                strapi.log.error('Error updating and publishing product:', updateError);
                
                // Fallback: Coba dengan method lama jika Document Service gagal
                try {
                  console.log('=== FALLBACK: LEGACY METHOD ===');
                  
                  // Update dengan publishedAt langsung
                  const fallbackResult = await strapi.entityService.update('api::product.product', product.id, {
                    data: {
                      variant: updatedVariants,
                      publishedAt: new Date()
                    }
                  });
                  
                  console.log('Fallback result:', fallbackResult?.publishedAt ? 'Published' : 'Failed');
                  
                } catch (fallbackError) {
                  console.log('Fallback error:', fallbackError);
                  strapi.log.error('Fallback update also failed:', fallbackError);
                }
              }
            } else {
              console.log('No matching variant found for stock reduction');
            }
          } else {
            console.log('No variants found in product');
          }
        } else {
          console.log('No product found with name:', productName);
        }
      } catch (error) {
        console.log('Error in stock reduction:', error);
        strapi.log.error('Error reducing product stock:', error);
      }
    }
    
    // Send vendor email confirmation if order is event equipment on payment settled
    if (isSettlement && wasNotSettlement) {
      try {
        const equipment = await strapi.entityService.findMany('api::equipment.equipment', {
          filters: {
            title: result.product_name
          },
          populate: ['users_permissions_user']
        });

        if (equipment.length > 0) {
          const equipmentItem = equipment[0];
          const vendorUser = equipmentItem.users_permissions_user;

          if (vendorUser && vendorUser.email) {
            const vendorEmail = vendorUser.email;

            const emailSubject = `Konfirmasi Pesanan Baru - ${result.product_name}`;
            const emailBody = `
Halo Vendor,

Anda menerima pesanan baru untuk produk peralatan event Anda.

Detail Pesanan:
- Order ID: ${result.order_id}
- Produk: ${result.product_name}
- Jumlah: ${result.quantity}
- Total Harga: Rp ${parseInt(result.total_price).toLocaleString('id-ID')}
- Tanggal Event: ${result.event_date}
- Status Pembayaran: ${result.payment_status}

Silakan cek sistem untuk detail lebih lanjut.

Terima kasih,
Tim Celeparty
`;

            // Use HTML email for vendor confirmation
            const vendorEmailHTML = `
<html>
  <body style="font-family: Arial, sans-serif; margin:0; padding:0;">
    <div style="background-color:#3E2882; padding:10px 20px; color:white; display:flex; align-items:center;">
      <img src="${process.env.FRONT_URL}/images/logo-white.png" alt="Celeparty Logo" style="height:40px;"/>
      <h2 style="margin-left:15px;">Konfirmasi Pesanan Baru</h2>
    </div>
    <div style="padding:20px; color:#333;">
      <p>Halo Vendor,</p>
      <p>Anda menerima pesanan baru untuk produk peralatan event Anda.</p>
      <h3>Detail Pesanan:</h3>
      <ul>
        <li><strong>Order ID:</strong> ${result.order_id}</li>
        <li><strong>Produk:</strong> ${result.product_name}</li>
        <li><strong>Jumlah:</strong> ${result.quantity}</li>
        <li><strong>Total Harga:</strong> Rp ${parseInt(result.total_price).toLocaleString('id-ID')}</li>
        <li><strong>Tanggal Event:</strong> ${result.event_date}</li>
        <li><strong>Status Pembayaran:</strong> ${result.payment_status}</li>
      </ul>
      <p>Silakan cek sistem untuk detail lebih lanjut.</p>
      <p>Terima kasih,<br/>Tim Celeparty</p>
    </div>
    <div style="background-color:#3E2882; color:white; padding:10px 20px; font-size:12px; display:flex; justify-content:space-between;">
      <div>Contact: support@celeparty.com</div>
      <div>IG: @celeparty_official | FB: Celeparty</div>
    </div>
  </body>
</html>`;

            await strapi.plugin('email').service('email').send({
              to: vendorEmail,
              subject: emailSubject,
              text: emailBody,
              html: vendorEmailHTML,
            });

            strapi.log.info(`Konfirmasi pesanan baru telah dikirim ke email vendor: ${vendorEmail} untuk order ${result.order_id}`);
          } else {
            strapi.log.warn(`Vendor tidak memiliki email pada equipment: ${equipmentItem.id}`);
          }
        } else {
          strapi.log.info(`Produk ${result.product_name} bukan peralatan event, tidak mengirim email vendor.`);
        }
      } catch (emailError) {
        strapi.log.error(`Gagal mengirim email konfirmasi ke vendor untuk order ${result.order_id}:`, emailError);
      }
    }
    
    console.log('Is settlement:', isSettlement);
    console.log('Was not settlement:', wasNotSettlement);
    console.log('Has customer mail:', !!result.customer_mail);
    
    const shouldSendEmail = result.customer_mail && isSettlement && wasNotSettlement;
    
    console.log('Should send email:', shouldSendEmail);
    
    // Send invoice email when payment is settled
    if (isSettlement && wasNotSettlement && result.customer_mail) {
      try {
        // Get ticket details for invoice
        const ticketDetails = await strapi.entityService.findMany('api::ticket-detail.ticket-detail', {
          filters: {
            transaction_ticket: result.id
          }
        });

        // Generate invoice PDF
        const invoiceBuffer = await generateInvoicePDF({
          transaction: result,
          ticketDetails: ticketDetails.length > 0 ? ticketDetails : [{
            recipient_name: result.customer_name,
            recipient_email: result.customer_mail,
            barcode: result.order_id
          }]
        });

        // Send invoice email
        const invoiceEmailBody = `
Halo ${result.customer_name},

Terlampir adalah invoice untuk pembelian tiket Anda.

Detail Transaksi:
- Order ID: ${result.order_id}
- Event: ${result.product_name}
- Tanggal Event: ${result.event_date}
- Varian: ${result.variant}
- Jumlah: ${result.quantity}
- Total: Rp ${parseInt(result.total_price).toLocaleString('id-ID')}

Invoice telah dilampirkan dalam bentuk PDF.

Terima kasih telah menggunakan Celeparty!`;

        const invoiceEmailHTML = `
<html>
  <body style="font-family: Arial, sans-serif; margin:0; padding:0;">
    <div style="background-color:#3E2882; padding:10px 20px; color:white; display:flex; align-items:center;">
      <img src="${process.env.FRONT_URL}/images/logo-white.png" alt="Celeparty Logo" style="height:40px;"/>
      <h2 style="margin-left:15px;">Invoice Pembelian Tiket</h2>
    </div>
    <div style="padding:20px; color:#333;">
      <p>Halo ${result.customer_name},</p>
      <p>Terlampir adalah invoice untuk pembelian tiket Anda.</p>
      <h3>Detail Transaksi:</h3>
      <ul>
        <li><strong>Order ID:</strong> ${result.order_id}</li>
        <li><strong>Event:</strong> ${result.product_name}</li>
        <li><strong>Tanggal Event:</strong> ${result.event_date}</li>
        <li><strong>Varian:</strong> ${result.variant}</li>
        <li><strong>Jumlah:</strong> ${result.quantity}</li>
        <li><strong>Total:</strong> Rp ${parseInt(result.total_price).toLocaleString('id-ID')}</li>
      </ul>
      <p>Invoice telah dilampirkan dalam bentuk PDF.</p>
      <p>Terima kasih telah menggunakan Celeparty!</p>
    </div>
    <div style="background-color:#3E2882; color:white; padding:10px 20px; font-size:12px; display:flex; justify-content:space-between;">
      <div>Contact: support@celeparty.com</div>
      <div>IG: @celeparty_official | FB: Celeparty</div>
    </div>
  </body>
</html>
`;

        await strapi.plugin('email').service('email').send({
          to: result.customer_mail,
          subject: `Invoice - Order ${result.order_id}`,
          text: invoiceEmailBody,
          html: invoiceEmailHTML,
          attachments: [
            {
              filename: `invoice-${result.order_id}.pdf`,
              content: invoiceBuffer,
              contentType: 'application/pdf',
            },
          ],
        });

        strapi.log.info(`Invoice email sent to ${result.customer_mail} for order ${result.order_id}`);
      } catch (invoiceError) {
        strapi.log.error('Error sending invoice email:', invoiceError);
      }
    }

    if (shouldSendEmail) {
      try {
        // Lazy load the PDF generator to avoid module resolution issues
        const generatorPath = path.resolve(__dirname, '../../utils/generateProfessionalTicketPDF.js');
        const { generateProfessionalTicketPDF } = require(generatorPath);
        
        const quantity = parseInt(result.quantity);

        if (quantity > 1) {
          // Handle multiple individual tickets
          const ticketDetails = await strapi.entityService.findMany('api::ticket-detail.ticket-detail', {
            filters: {
              transaction_ticket: result.id
            },
            populate: ['transaction_ticket']
          });

          if (ticketDetails.length > 0) {
            // Send individual emails for each ticket
            for (const ticketDetail of ticketDetails) {
              const baseUrl = process.env.FRONT_URL + '/qr';
              const params = new URLSearchParams({
                barcode: ticketDetail.barcode,
                event_date: result.event_date,
                customer_name: result.customer_name,
                email: result.customer_mail,
                event_type: result.event_type,
              }).toString();
              const qrUrl = `${baseUrl}?${params}`;

              const status = getTicketStatus(result.event_date);
              const pdfBuffer = await generateProfessionalTicketPDF({
                transaction: result,
                ticketDetail: ticketDetail,
                qrUrl: qrUrl,
                status: status
              });

              const emailBody = `
Halo ${ticketDetail.recipient_name},\n\nTransaksi Anda telah berhasil. Berikut detail tiket Anda:\n\n- Status Pembayaran: ${result.payment_status}\n- Varian: ${result.variant}\n- Barcode: ${ticketDetail.barcode}\n- Tanggal Acara: ${result.event_date}\n- Nama Pemesan: ${result.customer_name}\n- Telepon: ${result.telp}\n- Catatan: ${result.note}\n- Order ID: ${result.order_id}\n- Email: ${result.customer_mail}\n- Event Type: ${result.event_type}\n- Status Tiket: ${status}\n\nTiket Anda terlampir dalam bentuk PDF dengan QR code unik.\n\nTerima kasih telah menggunakan Celeparty!`;

              const emailSubject = (result.payment_status === 'settlement' || result.payment_status === 'Settlement')
                ? `Pembayaran Settlement - Tiket Anda Siap! (Barcode: ${ticketDetail.barcode})`
                : `Pembayaran Berhasil - Tiket Anda Siap! (Barcode: ${ticketDetail.barcode})`;

              const ticketEmailHTML = `
<html>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
    <div style="background-color: #3E2882; padding: 10px 20px; color: white; display: flex; align-items: center;">
      <img src="${process.env.FRONT_URL}/images/logo-white.png" alt="Celeparty Logo" style="height: 40px;" />
      <h2 style="margin-left: 15px;">Konfirmasi Pembayaran Tiket</h2>
    </div>
    <div style="padding: 20px; color: #333;">
      <p>Halo ${ticketDetail.recipient_name},</p>
      <p>Transaksi Anda telah berhasil. Berikut detail tiket Anda:</p>
      <ul>
        <li><strong>Status Pembayaran:</strong> ${result.payment_status}</li>
        <li><strong>Varian:</strong> ${result.variant}</li>
        <li><strong>Barcode:</strong> ${ticketDetail.barcode}</li>
        <li><strong>Tanggal Acara:</strong> ${result.event_date}</li>
        <li><strong>Nama Pemesan:</strong> ${result.customer_name}</li>
        <li><strong>Telepon:</strong> ${result.telp}</li>
        <li><strong>Catatan:</strong> ${result.note}</li>
        <li><strong>Order ID:</strong> ${result.order_id}</li>
        <li><strong>Email:</strong> ${result.customer_mail}</li>
        <li><strong>Event Type:</strong> ${result.event_type}</li>
        <li><strong>Status Tiket:</strong> ${status}</li>
      </ul>
      <p>Tiket Anda terlampir dalam bentuk PDF dengan QR code unik.</p>
      <p>Terima kasih telah menggunakan Celeparty!</p>
    </div>
    <div style="background-color: #3E2882; color: white; padding: 10px 20px; font-size: 12px; display: flex; justify-content: space-between;">
      <div>Contact: support@celeparty.com</div>
      <div>IG: @celeparty_official | FB: Celeparty</div>
    </div>
  </body>
</html>`;

              await strapi.plugin('email').service('email').send({
                to: ticketDetail.recipient_email,
                subject: emailSubject,
                text: emailBody,
                html: ticketEmailHTML,
                attachments: [
                  {
                    filename: `ticket-${result.order_id}-${ticketDetail.barcode}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                  },
                ],
              });

              strapi.log.info(`Email individual ticket sent to ${ticketDetail.recipient_email} for barcode ${ticketDetail.barcode}`);
            }
          }
        } else {
          // Handle single ticket (backward compatibility)
          const baseUrl = process.env.FRONT_URL + '/qr';
          const params = new URLSearchParams({
            order_id: result.order_id,
            event_date: result.event_date,
            customer_name: result.customer_name,
            email: result.customer_mail,
            event_type: result.event_type,
          }).toString();
          const qrUrl = `${baseUrl}?${params}`;

          const status = getTicketStatus(result.event_date);
          const pdfBuffer = await generateProfessionalTicketPDF({
            transaction: result,
            ticketDetail: {
              recipient_name: result.customer_name,
              recipient_email: result.customer_mail,
              barcode: result.order_id,
              whatsapp_number: result.telp,
              identity_type: 'KTP',
              identity_number: '-'
            },
            qrUrl: qrUrl,
            status: status
          });

          const emailBody = `
Halo,\n\nTransaksi Anda telah berhasil. Berikut detail transaksi Anda:\n\n- Status Pembayaran: ${result.payment_status}\n- Varian: ${result.variant}\n- Jumlah: ${result.quantity}\n- Tanggal Acara: ${result.event_date}\n- Nama Pemesan: ${result.customer_name}\n- Telepon: ${result.telp}\n- Catatan: ${result.note}\n- Order ID: ${result.order_id}\n- Email: ${result.customer_mail}\n- Event Type: ${result.event_type}\n- Status Tiket: ${status}\n\nTiket Anda terlampir dalam bentuk PDF dengan QR code.\n\nTerima kasih telah menggunakan Celeparty!`;

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
            html: `
            <html>
              <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
                <div style="background-color: #3E2882; padding: 10px 20px; color: white; display: flex; align-items: center;">
                  <img src="${process.env.FRONT_URL}/images/logo-white.png" alt="Celeparty Logo" style="height: 40px;" />
                  <h2 style="margin-left: 15px;">Konfirmasi Pembayaran Tiket</h2>
                </div>
                <div style="padding: 20px; color: #333;">
                  <p>Halo,</p>
                  <p>Transaksi Anda telah berhasil. Berikut detail transaksi Anda:</p>
                  <ul>
                    <li><strong>Status Pembayaran:</strong> ${result.payment_status}</li>
                    <li><strong>Varian:</strong> ${result.variant}</li>
                    <li><strong>Jumlah:</strong> ${result.quantity}</li>
                    <li><strong>Tanggal Acara:</strong> ${result.event_date}</li>
                    <li><strong>Nama Pemesan:</strong> ${result.customer_name}</li>
                    <li><strong>Telepon:</strong> ${result.telp}</li>
                    <li><strong>Catatan:</strong> ${result.note}</li>
                    <li><strong>Order ID:</strong> ${result.order_id}</li>
                    <li><strong>Email:</strong> ${result.customer_mail}</li>
                    <li><strong>Event Type:</strong> ${result.event_type}</li>
                    <li><strong>Status Tiket:</strong> ${status}</li>
                  </ul>
                  <p>Tiket Anda terlampir dalam bentuk PDF dengan QR code.</p>
                  <p>Terima kasih telah menggunakan Celeparty!</p>
                </div>
                <div style="background-color: #3E2882; color: white; padding: 10px 20px; font-size: 12px; display: flex; justify-content: space-between;">
                  <div>Contact: support@celeparty.com</div>
                  <div>IG: @celeparty_official | FB: Celeparty</div>
                </div>
              </body>
            </html>
            `
          });

          strapi.log.info(`Email konfirmasi pembayaran (${result.payment_status}) berhasil dikirim ke ${result.customer_mail} untuk order ${result.order_id}`);
        }
      } catch (err) {
        strapi.log.error('Gagal mengirim email konfirmasi pembayaran:', err);
      }
    }
  },
};
