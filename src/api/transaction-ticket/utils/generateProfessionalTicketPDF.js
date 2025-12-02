/**
 * Enhanced Ticket PDF Generator - Professional Design
 * Uses PDFKit to create professional ticket with new template design
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const COLORS = {
  primary: '#3E2882',      // c-blue
  accent: '#DA7E01',       // c-orange  
  gray: '#F5F5F5',
  text: '#000000',
  label: '#787878',
  white: '#FFFFFF'
};

async function generateProfessionalTicketPDF({ 
  transaction, 
  ticketDetail, 
  qrUrl,
  status 
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4'
      });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // ==================== HEADER SECTION ====================
      // Background color for header
      doc.rect(0, 0, doc.page.width, 120).fill(COLORS.primary);
      
      // Logo & Company Name
      try {
        const logoPath = path.resolve(__dirname, '../../../../public/images/logo-white.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 20, { width: 80 });
        }
      } catch (err) {
        console.log('Logo not found, skipping');
      }

      // Company name and slogan
      doc.fillColor(COLORS.white)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('CELEPARTY', 150, 25);
      
      doc.fillColor(COLORS.accent)
        .fontSize(12)
        .font('Helvetica')
        .text('Platform Tiket Acara Terpercaya', 150, 58);

      // ==================== BODY SECTION ====================
      doc.moveDown(6);

      // Section title: INFORMASI TIKET
      doc.fillColor(COLORS.primary)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('INFORMASI TIKET');
      
      doc.strokeColor(COLORS.accent)
        .lineWidth(2)
        .moveTo(40, doc.y)
        .lineTo(550, doc.y)
        .stroke();
      
      doc.moveDown(0.5);

      // Ticket details in 2 columns
      const ticketInfo = [
        { label: 'Nama Produk', value: transaction.product_name || '-' },
        { label: 'Kode Tiket', value: ticketDetail.barcode || transaction.order_id },
        { label: 'Varian', value: transaction.variant || '-' },
        { label: 'Tanggal Acara', value: transaction.event_date || '-' },
        { label: 'Lokasi Acara', value: transaction.event_type || '-' }
      ];

      doc.fontSize(9);
      const col1X = 50;
      const col2X = 320;
      
      ticketInfo.forEach((info, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const xPos = col === 0 ? col1X : col2X;
        const yPos = doc.y + (row * 20);

        // Label
        doc.fillColor(COLORS.label)
          .font('Helvetica-Bold')
          .text(info.label + ':', xPos, yPos, { width: 250 });

        // Value
        doc.fillColor(COLORS.text)
          .font('Helvetica')
          .text(info.value, xPos + 2, yPos + 12, { width: 250 });
      });

      doc.moveDown(8);

      // ==================== INFORMASI PENERIMA ====================
      doc.fillColor(COLORS.primary)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('INFORMASI PENERIMA');
      
      doc.strokeColor(COLORS.accent)
        .lineWidth(2)
        .moveTo(40, doc.y)
        .lineTo(550, doc.y)
        .stroke();
      
      doc.moveDown(0.5);

      const recipientInfo = [
        { label: 'Nama Penerima', value: ticketDetail.recipient_name || transaction.customer_name },
        { label: 'Email', value: ticketDetail.recipient_email || transaction.customer_mail },
        { label: 'Telepon', value: ticketDetail.whatsapp_number || transaction.telp || '-' },
        { label: 'Tipe Identitas', value: ticketDetail.identity_type || 'KTP' },
        { label: 'Nomor Identitas', value: ticketDetail.identity_number || '-' }
      ];

      doc.fontSize(9);
      recipientInfo.forEach((info, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const xPos = col === 0 ? col1X : col2X;
        const yPos = doc.y + (row * 20);

        // Label
        doc.fillColor(COLORS.label)
          .font('Helvetica-Bold')
          .text(info.label + ':', xPos, yPos, { width: 250 });

        // Value
        doc.fillColor(COLORS.text)
          .font('Helvetica')
          .text(info.value, xPos + 2, yPos + 12, { width: 250 });
      });

      doc.moveDown(8);

      // ==================== QR CODE SECTION ====================
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(COLORS.primary)
        .text('Pindai untuk Verifikasi', { align: 'center' });
      
      doc.moveDown(1);

      // Generate and embed QR code
      try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          color: {
            dark: COLORS.primary,
            light: '#FFFFFF'
          },
          width: 200,
          margin: 2,
          quality: 0.95
        });

        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        
        doc.image(qrBuffer, {
          fit: [150, 150],
          align: 'center'
        });
      } catch (qrErr) {
        console.log('QR code generation error:', qrErr);
        doc.fontSize(10)
          .fillColor(COLORS.text)
          .text('QR Code: ' + qrUrl, { align: 'center' });
      }

      doc.moveDown(2);

      // Status badge
      const statusColor = status === 'active' ? '#28a745' : '#ffc107';
      doc.rect(200, doc.y, 200, 30)
        .fill(statusColor);
      
      doc.fillColor(COLORS.white)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`Status: ${status.toUpperCase()}`, 200, doc.y + 8, {
          width: 200,
          align: 'center'
        });

      doc.moveDown(3);

      // ==================== DESKRIPSI ====================
      if (transaction.product_description) {
        doc.fillColor(COLORS.primary)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('DESKRIPSI ACARA');
        
        doc.strokeColor(COLORS.accent)
          .lineWidth(2)
          .moveTo(40, doc.y)
          .lineTo(550, doc.y)
          .stroke();
        
        doc.moveDown(0.5);

        doc.fillColor(COLORS.text)
          .fontSize(9)
          .font('Helvetica')
          .text(transaction.product_description, {
            width: 500,
            align: 'left'
          });
      }

      doc.moveDown(3);

      // Important note
      doc.fontSize(8)
        .fillColor(COLORS.label)
        .font('Helvetica-Oblique')
        .text('⚠ Jangan bagikan barcode ini dengan orang lain. Setiap tiket memiliki barcode unik.', {
          width: 500,
          align: 'left'
        });

      // ==================== FOOTER SECTION ====================
      const footerY = doc.page.height - 60;

      // Primary color line
      doc.strokeColor(COLORS.primary)
        .lineWidth(4)
        .moveTo(0, footerY)
        .lineTo(doc.page.width, footerY)
        .stroke();

      // Footer background
      doc.rect(0, footerY + 4, doc.page.width, 56)
        .fill(COLORS.gray);

      // Left: Date
      const dateStr = `Tanggal: ${new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;

      doc.fillColor(COLORS.text)
        .fontSize(8)
        .font('Helvetica')
        .text(dateStr, 50, footerY + 10);

      doc.fontSize(7)
        .font('Helvetica')
        .text(`Order ID: ${transaction.order_id}`, 50, footerY + 24);

      // Right: Contact & Social Media
      const contactX = 350;
      doc.fillColor(COLORS.primary)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Hubungi Kami:', contactX, footerY + 10);

      doc.fillColor(COLORS.text)
        .fontSize(7)
        .font('Helvetica')
        .text('📧 support@celeparty.com', contactX, footerY + 24);

      // Social media
      doc.fontSize(7)
        .text('📱 IG: @celeparty_official | TikTok: @celeparty', contactX, footerY + 34);

      doc.end();

    } catch (err) {
      console.error('PDF Generation Error:', err);
      reject(err);
    }
  });
}

module.exports = { generateProfessionalTicketPDF };
