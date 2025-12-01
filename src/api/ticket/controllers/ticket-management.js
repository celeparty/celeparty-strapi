'use strict';

/**
 * Ticket Management Controller
 * Handles all ticket management API endpoints for vendor dashboard
 */

const QRCode = require('qrcode');
const crypto = require('crypto');

module.exports = {
  /**
   * GET /api/tickets/summary
   * Get summary of all tickets sold by vendor
   */
  async getTicketSummary(ctx) {
    try {
      const userId = ctx.state.user.id;

      // Get all tickets created by this vendor
      const tickets = await strapi.db.query('api::ticket.ticket').findMany({
        where: {
          users_permissions_user: userId,
          publishedAt: { $notNull: true }
        },
        select: ['id', 'title', 'sold_count', 'created_at'],
        populate: {
          variant: true,
          ticket_details: {
            select: ['id', 'ticket_code', 'verification_status', 'payment_status', 'is_bypass', 'created_at']
          }
        }
      });

      // Build summary for each ticket
      const summary = tickets.map(ticket => {
        const details = ticket.ticket_details || [];
        const variants = ticket.variant || [];

        // Calculate per-variant stats
        const variantStats = {};
        variants.forEach(variant => {
          variantStats[variant.name] = {
            total: 0,
            verified: 0,
            paid: 0,
            bypass: 0,
            revenue: 0
          };
        });

        // Aggregate details
        details.forEach(detail => {
          const variant = detail.variant || 'default';
          if (!variantStats[variant]) {
            variantStats[variant] = {
              total: 0,
              verified: 0,
              paid: 0,
              bypass: 0,
              revenue: 0
            };
          }
          
          variantStats[variant].total++;
          if (detail.verification_status === 'verified') {
            variantStats[variant].verified++;
          }
          if (detail.payment_status === 'paid') {
            variantStats[variant].paid++;
          }
          if (detail.is_bypass) {
            variantStats[variant].bypass++;
          }
        });

        return {
          id: ticket.id,
          title: ticket.title,
          totalSold: ticket.sold_count || details.length,
          totalTickets: details.length,
          verifiedTickets: details.filter(d => d.verification_status === 'verified').length,
          paidTickets: details.filter(d => d.payment_status === 'paid').length,
          bypassTickets: details.filter(d => d.is_bypass).length,
          variants: variantStats,
          createdAt: ticket.created_at
        };
      });

      ctx.body = {
        success: true,
        data: summary
      };
    } catch (err) {
      ctx.badRequest('Error fetching ticket summary', { error: err.message });
    }
  },

  /**
   * GET /api/tickets/:ticketId/details
   * Get detailed list of tickets with filtering and sorting
   */
  async getTicketDetails(ctx) {
    try {
      const { ticketId } = ctx.params;
      const { 
        page = 1, 
        pageSize = 10, 
        variantId, 
        search, 
        verificationStatus, 
        paymentStatus, 
        sortBy = 'created_at', 
        sortOrder = 'desc' 
      } = ctx.query;

      // Verify ticket belongs to user
      const ticket = await strapi.db.query('api::ticket.ticket').findOne({
        where: {
          id: ticketId,
          users_permissions_user: ctx.state.user.id
        }
      });

      if (!ticket) {
        return ctx.forbidden('Not authorized to view this ticket');
      }

      let filters = { ticket: ticketId };
      
      if (variantId && variantId !== 'all') {
        filters.variant = variantId;
      }

      if (search) {
        filters.$or = [
          { ticket_code: { $contains: search } },
          { buyer_name: { $contains: search } },
          { buyer_email: { $contains: search } },
          { buyer_phone: { $contains: search } }
        ];
      }

      if (verificationStatus) {
        filters.verification_status = verificationStatus;
      }

      if (paymentStatus) {
        filters.payment_status = paymentStatus;
      }

      const skip = (page - 1) * pageSize;
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [data, total] = await Promise.all([
        strapi.db.query('api::ticket-detail.ticket-detail').findMany({
          where: filters,
          select: ['id', 'ticket_code', 'unique_token', 'verification_status', 'payment_status', 'buyer_name', 'buyer_email', 'buyer_phone', 'verified_at', 'is_bypass', 'created_at'],
          orderBy: sort,
          limit: parseInt(pageSize),
          offset: skip,
          populate: {
            verified_by: { select: ['id', 'username'] }
          }
        }),
        strapi.db.query('api::ticket-detail.ticket-detail').count({ where: filters })
      ]);

      ctx.body = {
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    } catch (err) {
      ctx.badRequest('Error fetching ticket details', { error: err.message });
    }
  },

  /**
   * POST /api/tickets/scan
   * Scan and verify QR code
   */
  async scanTicket(ctx) {
    try {
      const { encodedToken, ticketCode } = ctx.request.body;

      if (!encodedToken && !ticketCode) {
        return ctx.badRequest('Either encodedToken or ticketCode is required');
      }

      // Find ticket by token or code
      let filters = {};
      if (encodedToken) {
        filters.unique_token = encodedToken;
      } else {
        filters.ticket_code = ticketCode;
      }

      const ticketDetail = await strapi.db.query('api::ticket-detail.ticket-detail').findOne({
        where: filters,
        populate: {
          ticket: true,
          verified_by: true
        }
      });

      if (!ticketDetail) {
        return ctx.badRequest('Ticket not found');
      }

      ctx.body = {
        success: true,
        data: {
          id: ticketDetail.id,
          ticket_code: ticketDetail.ticket_code,
          buyer_name: ticketDetail.buyer_name,
          buyer_email: ticketDetail.buyer_email,
          verification_status: ticketDetail.verification_status,
          payment_status: ticketDetail.payment_status,
          verified_at: ticketDetail.verified_at,
          verified_by: ticketDetail.verified_by,
          ticket: {
            id: ticketDetail.ticket.id,
            title: ticketDetail.ticket.title
          }
        }
      };
    } catch (err) {
      ctx.badRequest('Error scanning ticket', { error: err.message });
    }
  },

  /**
   * POST /api/tickets/:ticketDetailId/verify
   * Verify a ticket
   */
  async verifyTicket(ctx) {
    try {
      const { ticketDetailId } = ctx.params;
      const { verificationMode = 'scanned' } = ctx.request.body;
      const userId = ctx.state.user.id;

      const ticketDetail = await strapi.db.query('api::ticket-detail.ticket-detail').findOne({
        where: { id: ticketDetailId },
        populate: { ticket: true }
      });

      if (!ticketDetail) {
        return ctx.notFound('Ticket not found');
      }

      // Verify user owns the ticket event
      const ticketEvent = await strapi.db.query('api::ticket.ticket').findOne({
        where: {
          id: ticketDetail.ticket.id,
          users_permissions_user: userId
        }
      });

      if (!ticketEvent) {
        return ctx.forbidden('Not authorized to verify this ticket');
      }

      // Update ticket status
      const now = new Date();
      const updatedTicket = await strapi.db.query('api::ticket-detail.ticket-detail').update({
        where: { id: ticketDetailId },
        data: {
          verification_status: 'verified',
          verified_at: now,
          verified_by: userId
        }
      });

      // Create verification log
      await strapi.db.query('api::ticket-verification.ticket-verification').create({
        data: {
          ticket_detail: ticketDetailId,
          ticket_code: ticketDetail.ticket_code,
          verification_type: verificationMode,
          verified_by: userId,
          verified_at: now,
          result: 'success',
          ip_address: ctx.request.ip,
          device_info: ctx.request.headers['user-agent']
        }
      });

      ctx.body = {
        success: true,
        message: 'Ticket verified successfully',
        data: updatedTicket
      };
    } catch (err) {
      ctx.badRequest('Error verifying ticket', { error: err.message });
    }
  },

  /**
   * GET /api/tickets/:ticketDetailId/verification-history
   * Get verification history for a ticket
   */
  async getVerificationHistory(ctx) {
    try {
      const { ticketDetailId } = ctx.params;
      const { page = 1, pageSize = 10 } = ctx.query;

      const ticketDetail = await strapi.db.query('api::ticket-detail.ticket-detail').findOne({
        where: { id: ticketDetailId },
        populate: { ticket: true }
      });

      if (!ticketDetail) {
        return ctx.notFound('Ticket not found');
      }

      // Verify ownership
      const ticket = await strapi.db.query('api::ticket.ticket').findOne({
        where: {
          id: ticketDetail.ticket.id,
          users_permissions_user: ctx.state.user.id
        }
      });

      if (!ticket) {
        return ctx.forbidden('Not authorized to view this history');
      }

      const skip = (page - 1) * pageSize;

      const [data, total] = await Promise.all([
        strapi.db.query('api::ticket-verification.ticket-verification').findMany({
          where: { ticket_detail: ticketDetailId },
          orderBy: { created_at: 'desc' },
          limit: parseInt(pageSize),
          offset: skip,
          populate: {
            verified_by: { select: ['id', 'username', 'email'] }
          }
        }),
        strapi.db.query('api::ticket-verification.ticket-verification').count({
          where: { ticket_detail: ticketDetailId }
        })
      ]);

      ctx.body = {
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    } catch (err) {
      ctx.badRequest('Error fetching verification history', { error: err.message });
    }
  },

  /**
   * POST /api/tickets/send-invitation
   * Create bypass tickets and send email invitations
   */
  async sendInvitation(ctx) {
    try {
      const userId = ctx.state.user.id;
      const { ticketId, recipients, productId, variantId, message } = ctx.request.body;

      if (!ticketId || !recipients || recipients.length === 0) {
        return ctx.badRequest('ticketId and recipients array are required');
      }

      // Verify ticket ownership
      const ticket = await strapi.db.query('api::ticket.ticket').findOne({
        where: {
          id: ticketId,
          users_permissions_user: userId
        }
      });

      if (!ticket) {
        return ctx.forbidden('Not authorized to send invitations for this ticket');
      }

      // Generate tickets and send emails
      const createdTickets = [];
      const sendHistory = {
        ticket: ticketId,
        product: productId,
        variant: variantId,
        sent_by: userId,
        recipient_count: recipients.length,
        recipients: JSON.stringify(recipients),
        message,
        sent_at: new Date(),
        status: 'pending'
      };

      let successCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        try {
          // Generate unique token
          const uniqueToken = crypto.randomBytes(32).toString('hex');
          const ticketCode = `TK-${Date.now()}-${createdTickets.length + 1}`;

          // Generate QR code
          const qrCode = await QRCode.toDataURL(uniqueToken);

          // Create ticket detail record
          const newTicket = await strapi.db.query('api::ticket-detail.ticket-detail').create({
            data: {
              ticket: ticketId,
              product: productId,
              variant: variantId,
              ticket_code: ticketCode,
              unique_token: uniqueToken,
              qr_code: qrCode,
              verification_status: 'unused',
              payment_status: 'pending',
              buyer_name: recipient.name,
              buyer_email: recipient.email,
              buyer_phone: recipient.phone,
              is_bypass: true,
              bypass_created_by: userId,
              bypass_created_at: new Date()
            }
          });

          createdTickets.push(newTicket);

          // Send email
          try {
            await strapi.plugins['email'].services.email.send({
              to: recipient.email,
              from: process.env.SMTP_FROM || 'noreply@celeparty.com',
              subject: `Undangan Tiket: ${ticket.title}`,
              html: `
                <h2>Undangan Tiket ${ticket.title}</h2>
                <p>Halo ${recipient.name},</p>
                <p>Anda telah menerima undangan tiket untuk acara: <strong>${ticket.title}</strong></p>
                <p><strong>Kode Tiket:</strong> ${ticketCode}</p>
                ${message ? `<p><strong>Pesan:</strong> ${message}</p>` : ''}
                <p><img src="${qrCode}" alt="QR Code" style="max-width: 200px;"></p>
                <p>Gunakan QR code di atas untuk verifikasi tiket pada hari acara.</p>
                <p>Terima kasih telah bergabung!</p>
              `
            });
            successCount++;
          } catch (emailErr) {
            console.error('Email send error:', emailErr);
            failedCount++;
          }
        } catch (ticketErr) {
          console.error('Ticket creation error:', ticketErr);
          failedCount++;
        }
      }

      sendHistory.successful_count = successCount;
      sendHistory.failed_count = failedCount;
      sendHistory.status = failedCount === 0 ? 'sent' : failedCount < successCount ? 'partially_sent' : 'failed';

      // Create send history record
      await strapi.db.query('api::ticket-send-history.ticket-send-history').create({
        data: sendHistory
      });

      ctx.body = {
        success: true,
        message: `Invitations sent successfully to ${successCount} recipients`,
        data: {
          ticketsCreated: createdTickets.length,
          successCount,
          failedCount,
          tickets: createdTickets
        }
      };
    } catch (err) {
      ctx.badRequest('Error sending invitations', { error: err.message });
    }
  },

  /**
   * GET /api/tickets/send-history
   * Get history of ticket invitations sent
   */
  async getSendHistory(ctx) {
    try {
      const userId = ctx.state.user.id;
      const { page = 1, pageSize = 10, ticketId } = ctx.query;

      let filters = { sent_by: userId };
      if (ticketId) {
        filters.ticket = ticketId;
      }

      const skip = (page - 1) * pageSize;

      const [data, total] = await Promise.all([
        strapi.db.query('api::ticket-send-history.ticket-send-history').findMany({
          where: filters,
          orderBy: { sent_at: 'desc' },
          limit: parseInt(pageSize),
          offset: skip,
          populate: {
            ticket: { select: ['id', 'title'] },
            product: { select: ['id', 'title'] }
          }
        }),
        strapi.db.query('api::ticket-send-history.ticket-send-history').count({ where: filters })
      ]);

      ctx.body = {
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    } catch (err) {
      ctx.badRequest('Error fetching send history', { error: err.message });
    }
  }
};
