'use strict';

/**
 * Ticket Management Service
 * Utility functions for ticket operations
 */

const QRCode = require('qrcode');
const crypto = require('crypto');

module.exports = ({ strapi }) => ({
  /**
   * Generate unique ticket code
   * Format: TK-YYYYMMDD-XXXX
   */
  generateTicketCode(ticketId) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TK-${date}-${random}`;
  },

  /**
   * Generate unique token for QR code
   */
  generateUniqueToken() {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Generate QR code from token
   */
  async generateQRCode(token) {
    try {
      return await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300
      });
    } catch (err) {
      throw new Error(`Failed to generate QR code: ${err.message}`);
    }
  },

  /**
   * Encrypt token for additional security
   */
  encryptToken(token, encryptionKey = process.env.TICKET_ENCRYPTION_KEY) {
    if (!encryptionKey) {
      console.warn('TICKET_ENCRYPTION_KEY not set, skipping encryption');
      return token;
    }

    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  },

  /**
   * Decrypt token
   */
  decryptToken(encryptedToken, encryptionKey = process.env.TICKET_ENCRYPTION_KEY) {
    if (!encryptionKey) {
      return encryptedToken;
    }

    try {
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      throw new Error(`Failed to decrypt token: ${err.message}`);
    }
  },

  /**
   * Create ticket batch
   */
  async createTicketBatch(ticketId, productId, variantId, buyerInfo, options = {}) {
    const token = this.generateUniqueToken();
    const code = this.generateTicketCode(ticketId);
    const qrCode = await this.generateQRCode(token);
    const encryptedToken = this.encryptToken(token);

    return {
      ticket: ticketId,
      product: productId,
      variant: variantId,
      ticket_code: code,
      unique_token: token,
      qr_code: qrCode,
      qr_code_encrypted: encryptedToken,
      verification_status: 'unused',
      payment_status: options.paymentStatus || 'pending',
      buyer_name: buyerInfo.name,
      buyer_email: buyerInfo.email,
      buyer_phone: buyerInfo.phone,
      is_bypass: options.isBypass || false,
      bypass_created_by: options.createdBy || null,
      bypass_created_at: options.isBypass ? new Date() : null
    };
  },

  /**
   * Send ticket email invitation
   */
  async sendTicketEmail(recipient, ticketInfo, qrCodeDataUrl) {
    try {
      const emailService = strapi.plugins['email'].services.email;

      const html = `
        <!DOCTYPE html>
        <html dir="ltr" lang="en">
          <head>
            <meta charset="UTF-8">
            <meta content="width=device-width, initial-scale=1" name="viewport">
            <title>Undangan Tiket ${ticketInfo.title}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4a90e2; text-align: center;">Undangan Tiket Acara</h2>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p>Halo <strong>${recipient.name}</strong>,</p>
                
                <p>Anda telah menerima undangan tiket untuk acara berikut:</p>
                
                <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p><strong>📍 Nama Acara:</strong> ${ticketInfo.title}</p>
                  <p><strong>📅 Tanggal:</strong> ${ticketInfo.eventDate || 'TBD'}</p>
                  <p><strong>⏰ Waktu:</strong> ${ticketInfo.eventTime || 'TBD'}</p>
                  <p><strong>📍 Lokasi:</strong> ${ticketInfo.eventLocation || 'TBD'}</p>
                  <p><strong>🎫 Kode Tiket:</strong> ${ticketInfo.ticketCode}</p>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                  <p><strong>Scan QR Code di bawah untuk verifikasi:</strong></p>
                  <img src="${qrCodeDataUrl}" alt="QR Code Tiket" style="max-width: 250px; height: auto; border: 2px solid #ddd; padding: 10px;">
                </div>

                ${ticketInfo.message ? `
                  <div style="background: #fffacd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0;">
                    <p><strong>Catatan:</strong> ${ticketInfo.message}</p>
                  </div>
                ` : ''}

                <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <strong>Instruksi Penggunaan Tiket:</strong>
                </p>
                <ol>
                  <li>Simpan email ini atau screenshot QR code</li>
                  <li>Pada hari acara, tunjukkan QR code untuk verifikasi</li>
                  <li>Staff akan melakukan scanning untuk verifikasi kehadiran</li>
                  <li>Setelah terverifikasi, Anda dapat masuk ke acara</li>
                </ol>

                <p style="margin-top: 20px; color: #666; font-size: 12px; text-align: center;">
                  Email ini adalah resmi dan penting. Jangan bagikan kode tiket dengan orang lain.
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                <p>© Celeparty - Platform Tiket Acara Terpercaya</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await emailService.send({
        to: recipient.email,
        from: process.env.SMTP_FROM || 'noreply@celeparty.com',
        subject: `Undangan Tiket: ${ticketInfo.title}`,
        html
      });

      return { success: true };
    } catch (err) {
      throw new Error(`Failed to send email: ${err.message}`);
    }
  },

  /**
   * Create verification log
   */
  async createVerificationLog(ticketDetailId, ticketCode, verificationData) {
    return await strapi.db.query('api::ticket-verification.ticket-verification').create({
      data: {
        ticket_detail: ticketDetailId,
        ticket_code: ticketCode,
        verification_type: verificationData.type || 'manual',
        verified_by: verificationData.verifiedBy,
        verified_at: new Date(),
        result: verificationData.result || 'success',
        failure_reason: verificationData.failureReason,
        ip_address: verificationData.ipAddress,
        device_info: verificationData.deviceInfo,
        notes: verificationData.notes
      }
    });
  },

  /**
   * Get ticket statistics
   */
  async getTicketStatistics(ticketId, userId) {
    // Verify ownership
    const ticket = await strapi.db.query('api::ticket.ticket').findOne({
      where: {
        id: ticketId,
        users_permissions_user: userId
      }
    });

    if (!ticket) {
      throw new Error('Ticket not found or not authorized');
    }

    const details = await strapi.db.query('api::ticket-detail.ticket-detail').findMany({
      where: { ticket: ticketId }
    });

    return {
      total: details.length,
      verified: details.filter(d => d.verification_status === 'verified').length,
      unused: details.filter(d => d.verification_status === 'unused').length,
      invalid: details.filter(d => d.verification_status === 'invalid').length,
      paid: details.filter(d => d.payment_status === 'paid').length,
      pending: details.filter(d => d.payment_status === 'pending').length,
      bypass: details.filter(d => d.is_bypass).length,
      verificationRate: details.length > 0 ? (details.filter(d => d.verification_status === 'verified').length / details.length * 100).toFixed(2) : 0
    };
  }
});
