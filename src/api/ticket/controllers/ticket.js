'use strict';

/**
 * ticket controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ticket.ticket', {
  /**
   * Override find to filter by current user (vendor)
   */
  async find(ctx) {
    try {
      const userId = ctx.state.user?.id;
      
      if (!userId) {
        return ctx.unauthorized('User not authenticated');
      }

      // Set filter to only return tickets owned by current user
      ctx.query.filters = ctx.query.filters || {};
      ctx.query.filters.users_permissions_user = userId;

      // Call the default find handler with the modified query
      const result = await super.find(ctx);
      
      console.log(`Fetched ${result.data?.length || 0} tickets for user ${userId}`);
      
      return result;
    } catch (error) {
      console.error('Error in ticket find:', error);
      return ctx.badRequest('Error fetching tickets', { error: error.message });
    }
  },

  /**
   * Override findOne to ensure user owns the ticket
   */
  async findOne(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const ticketId = ctx.params.id;

      if (!userId) {
        return ctx.unauthorized('User not authenticated');
      }

      // Fetch the ticket
      const ticket = await strapi.db.query('api::ticket.ticket').findOne({
        where: {
          documentId: ticketId,
          users_permissions_user: userId,
        },
        populate: '*',
      });

      if (!ticket) {
        return ctx.notFound('Ticket not found or access denied');
      }

      ctx.body = { data: ticket };
    } catch (error) {
      console.error('Error in ticket findOne:', error);
      return ctx.badRequest('Error fetching ticket', { error: error.message });
    }
  },
});
