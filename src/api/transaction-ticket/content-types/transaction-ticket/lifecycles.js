const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');
const crypto = require('crypto');

async function generateInvoicePDF({ transaction, ticketDetails }) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create PDF
      const doc = new PDFDocument();
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.fontSize(14).text('Celeparty Event Management', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(12);
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
      doc.moveDown(2);
      doc.fontSize(10).text('Thank you for choosing Celeparty!', { align: 'center' });
      doc.text('For any questions, please contact our support team.', { align: 'center' });

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

            await strapi.plugin('email').service('email').send({
              to: vendorEmail,
              subject: emailSubject,
              text: emailBody,
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

        await strapi.plugin('email').service('email').send({
          to: result.customer_mail,
          subject: `Invoice - Order ${result.order_id}`,
          text: invoiceEmailBody,
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
              const pdfBuffer = await generateTicketPDF({
                url: qrUrl,
                transaction: result,
                status,
                recipientName: ticketDetail.recipient_name,
                recipientEmail: ticketDetail.recipient_email,
                barcode: ticketDetail.barcode
              });

              const emailBody = `
Halo ${ticketDetail.recipient_name},\n\nTransaksi Anda telah berhasil. Berikut detail tiket Anda:\n\n- Status Pembayaran: ${result.payment_status}\n- Varian: ${result.variant}\n- Barcode: ${ticketDetail.barcode}\n- Tanggal Acara: ${result.event_date}\n- Nama Pemesan: ${result.customer_name}\n- Telepon: ${result.telp}\n- Catatan: ${result.note}\n- Order ID: ${result.order_id}\n- Email: ${result.customer_mail}\n- Event Type: ${result.event_type}\n- Status Tiket: ${status}\n\nTiket Anda terlampir dalam bentuk PDF dengan QR code unik.\n\nTerima kasih telah menggunakan Celeparty!`;

              const emailSubject = (result.payment_status === 'settlement' || result.payment_status === 'Settlement')
                ? `Pembayaran Settlement - Tiket Anda Siap! (Barcode: ${ticketDetail.barcode})`
                : `Pembayaran Berhasil - Tiket Anda Siap! (Barcode: ${ticketDetail.barcode})`;

              await strapi.plugin('email').service('email').send({
                to: ticketDetail.recipient_email,
                subject: emailSubject,
                text: emailBody,
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
          const pdfBuffer = await generateTicketPDF({
            url: qrUrl,
            transaction: result,
            status,
            recipientName: result.customer_name,
            recipientEmail: result.customer_mail,
            barcode: result.order_id
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
          });

          strapi.log.info(`Email konfirmasi pembayaran (${result.payment_status}) berhasil dikirim ke ${result.customer_mail} untuk order ${result.order_id}`);
        }
      } catch (err) {
        strapi.log.error('Gagal mengirim email konfirmasi pembayaran:', err);
      }
    }
  },
};
