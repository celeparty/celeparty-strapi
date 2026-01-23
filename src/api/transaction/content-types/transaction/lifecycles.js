const path = require('path');

function getTicketStatus(eventDate) {
  const today = new Date();
  const event = new Date(eventDate);
  today.setHours(0,0,0,0);
  event.setHours(0,0,0,0);
  return today <= event ? 'active' : 'not active';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function generateInvoiceEmail(transaction) {
  const products = Array.isArray(transaction.products) ? transaction.products : [];
  const productsHtml = products
    .map((p, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${p.product_name || 'Product'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${p.quantity || 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(p.price || 0)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency((p.price || 0) * (p.quantity || 1))}</td>
      </tr>
    `)
    .join('');

  const totalAmount = products.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0);

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Transaksi</title>
  <style>
    * { margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .content {
      padding: 30px;
    }
    .invoice-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 20px;
    }
    .invoice-section h3 {
      color: #667eea;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .invoice-section p {
      color: #333;
      font-size: 14px;
      line-height: 1.6;
    }
    .invoice-number {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .products-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .products-table thead {
      background-color: #f0f0f0;
      border-bottom: 2px solid #667eea;
    }
    .products-table th {
      padding: 12px;
      text-align: left;
      font-weight: bold;
      color: #333;
    }
    .products-table td {
      padding: 8px;
      color: #333;
    }
    .summary-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      margin-bottom: 10px;
      padding: 8px 0;
    }
    .summary-label {
      text-align: right;
      font-weight: 500;
    }
    .summary-value {
      text-align: right;
      font-weight: 500;
    }
    .total-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      padding: 15px;
      background-color: #f0f0f0;
      border-radius: 4px;
      border-left: 4px solid #667eea;
      margin-top: 15px;
    }
    .total-row .summary-label {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
    .total-row .summary-value {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }
    .status-badge {
      display: inline-block;
      background-color: #28a745;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Invoice Transaksi</h1>
      <p>Terima kasih telah berbelanja di CeleParty</p>
    </div>

    <div class="content">
      <div class="invoice-header">
        <div class="invoice-section">
          <div class="invoice-number">Invoice #${transaction.order_id}</div>
          <h3>Informasi Pembeli</h3>
          <p>
            <strong>${transaction.customer_name}</strong><br>
            Email: ${transaction.email}<br>
            Telepon: ${transaction.telp || '-'}
          </p>
        </div>
        <div class="invoice-section">
          <h3>Status Pembayaran</h3>
          <p>
            <span class="status-badge">${transaction.payment_status?.toUpperCase() || 'PENDING'}</span><br><br>
            Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <table class="products-table">
        <thead>
          <tr>
            <th style="width: 5%;">No</th>
            <th style="width: 45%;">Produk</th>
            <th style="width: 15%; text-align: right;">Qty</th>
            <th style="width: 18%; text-align: right;">Harga</th>
            <th style="width: 17%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productsHtml}
        </tbody>
      </table>

      <div style="text-align: right;">
        <div class="summary-row">
          <span class="summary-label">Subtotal:</span>
          <span class="summary-value">${formatCurrency(totalAmount)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Biaya Admin:</span>
          <span class="summary-value">${formatCurrency(0)}</span>
        </div>
        <div class="total-row">
          <span class="summary-label">Total Pembayaran:</span>
          <span class="summary-value">${formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div style="background-color: #f0f8ff; border-left: 4px solid #667eea; padding: 15px; margin-top: 30px; border-radius: 4px;">
        <p style="color: #004085; font-size: 14px; line-height: 1.6;">
          <strong>📌 Informasi Penting:</strong><br>
          ✓ Invoice ini merupakan bukti pembayaran resmi<br>
          ✓ Simpan invoice ini untuk keperluan administrasi<br>
          ✓ Tiket akan dikirim ke email Anda melalui email terpisah<br>
          ✓ Untuk pertanyaan, hubungi support@celeparty.com
        </p>
      </div>
    </div>

    <div class="footer">
      <p>Email ini adalah otomatis. Jangan balas email ini.</p>
      <p>© 2024 CeleParty. Semua hak dilindungi.</p>
    </div>
  </div>
</body>
</html>
  `;
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

  async afterUpdate(event) {
    const { result, params } = event;

    // Send invoice email when payment status changes to settlement
    if (params.data.payment_status === 'settlement' && result.email) {
      try {
        strapi.log.info(`[Invoice Email] Sending invoice email for transaction ID: ${result.id}`);

        const invoiceHtml = generateInvoiceEmail(result);

        await strapi.plugin('email').service('email').send({
          to: result.email,
          subject: `Invoice Transaksi #${result.order_id} - CeleParty`,
          html: invoiceHtml,
        });

        strapi.log.info(`[Invoice Email] Successfully sent invoice email to ${result.email}`);
      } catch (err) {
        strapi.log.error(`[Invoice Email] Failed to send invoice email for transaction ${result.id}:`, err);
      }
    }
  },
};
