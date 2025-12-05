'use strict';

/**
 * ticket controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ticket.ticket', {
  /**
   * Override create to set users_permissions_user from context
   */
  async create(ctx) {
    try {
      const userId = ctx.state.user?.id;
      
      if (!userId) {
        return ctx.unauthorized('User not authenticated');
      }

      // Get request body
      const { data } = ctx.request.body;

      // Set users_permissions_user from context (not from request)
      // For oneToOne relation, use direct id not array
      if (!data) {
        return ctx.badRequest('Request body with data is required');
      }

      data.users_permissions_user = userId;
      
      // Set initial status as unpublished (will be published by admin through Strapi)
      data.publishedAt = null;

      console.log('Creating ticket for user:', userId);
      console.log('Ticket data:', JSON.stringify(data, null, 2));

      // Call the default create handler
      const result = await super.create(ctx);
      
      console.log('Ticket created successfully:', result.data?.id);
      
      return result;
    } catch (error) {
      console.error('Error in ticket create:', error);
      console.error('Error details:', error.message, error.stack);
      return ctx.internalServerError('Error creating ticket', { error: error.message });
    }
  },

  /**
   * Override update to ensure user owns the ticket and set users_permissions_user
   */
  async update(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const ticketId = ctx.params.id;

      if (!userId) {
        return ctx.unauthorized('User not authenticated');
      }

      // Verify ownership
      const ticket = await strapi.db.query('api::ticket.ticket').findOne({
        where: {
          documentId: ticketId,
        },
      });

      if (!ticket || ticket.users_permissions_user !== userId) {
        return ctx.forbidden('Not authorized to update this ticket');
      }

      // Get request body and ensure users_permissions_user stays the same
      const { data } = ctx.request.body;
      if (data) {
        data.users_permissions_user = userId;
      }

      console.log('Updating ticket:', ticketId, 'for user:', userId);

      // Call the default update handler
      const result = await super.update(ctx);
      
      console.log('Ticket updated successfully:', result.data?.id);
      
      return result;
    } catch (error) {
      console.error('Error in ticket update:', error);
      console.error('Error details:', error.message, error.stack);
      return ctx.internalServerError('Error updating ticket', { error: error.message });
    }
  },

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

  /**
   * Override delete to ensure user owns the ticket
   */
  async delete(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const ticketId = ctx.params.id;

      if (!userId) {
        return ctx.unauthorized('User not authenticated');
      }

      // Verify ownership before deleting
      const ticket = await strapi.db.query('api::ticket.ticket').findOne({
        where: {
          documentId: ticketId,
        },
      });

      if (!ticket || ticket.users_permissions_user !== userId) {
        return ctx.forbidden('Not authorized to delete this ticket');
      }

      // Call the default delete handler
      const result = await super.delete(ctx);
      
      console.log('Ticket deleted successfully:', ticketId);
      
      return result;
    } catch (error) {
      console.error('Error in ticket delete:', error);
      return ctx.internalServerError('Error deleting ticket', { error: error.message });
    }
  },
});
