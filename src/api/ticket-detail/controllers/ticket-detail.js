/**
 * ticket-detail controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ticket-detail.ticket-detail', ({ strapi }) => ({
  /**
   * Get all ticket details for a specific ticket product
   * GET /api/tickets/details/:ticketId
   */
  async getTicketsByProduct(ctx) {
    try {
      const { ticketId, variantId } = ctx.params;
      const { page = 1, pageSize = 10, search, verificationStatus, paymentStatus, sortBy = 'created_at', sortOrder = 'desc' } = ctx.query;

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

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [data, total] = await Promise.all([
        strapi.db.query('api::ticket-detail.ticket-detail').findMany({
          where: filters,
          select: ['id', 'ticket_code', 'unique_token', 'verification_status', 'payment_status', 'buyer_name', 'buyer_email', 'buyer_phone', 'verified_at', 'is_bypass', 'created_at'],
          orderBy: sort,
          limit: pageSize,
          offset: skip,
          populate: {
            verified_by: { select: ['id', 'username'] }
          }
        }),
        strapi.db.query('api::ticket-detail.ticket-detail').count({ where: filters })
      ]);

      return {
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
  }
}));
