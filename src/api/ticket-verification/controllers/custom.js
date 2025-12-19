'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ticket-verification.ticket-verification', ({ strapi }) => ({
  /**
   * Verifies a ticket by its unique code.
   * @param {object} ctx - The Koa context.
   */
  async verifyByCode(ctx) {
    const { code } = ctx.params;

    if (!code) {
      return ctx.badRequest('Ticket code is required.');
    }

    try {
      const tickets = await strapi.entityService.findMany('api::ticket-detail.ticket-detail', {
        filters: { ticket_code: code },
        populate: ['product', 'transaction_ticket', 'user'],
      });

      if (!tickets || tickets.length === 0) {
        return ctx.notFound('Ticket not found.');
      }

      const ticket = tickets[0];
      return ctx.send({ data: ticket });

    } catch (error) {
      strapi.log.error('Failed to verify ticket by code:', error);
      return ctx.internalServerError('An error occurred during ticket verification.');
    }
  },

  /**
   * Marks a ticket as used.
   * @param {object} ctx - The Koa context.
   */
  async markAsUsed(ctx) {
    const { id } = ctx.params;

    if (!id) {
      return ctx.badRequest('Ticket ID is required.');
    }

    try {
      const ticket = await strapi.entityService.findOne('api::ticket-detail.ticket-detail', id);

      if (!ticket) {
        return ctx.notFound('Ticket not found.');
      }

      if (ticket.status === 'used') {
        return ctx.conflict('Ticket has already been used.');
      }

      const updatedTicket = await strapi.entityService.update('api::ticket-detail.ticket-detail', id, {
        data: {
          status: 'used',
          verified_at: new Date(),
          // verified_by: ctx.state.user.id // Uncomment if auth is enabled to track who verified it
        },
      });

      return ctx.send({
        message: 'Ticket successfully marked as used.',
        data: updatedTicket,
      });

    } catch (error) {
      strapi.log.error(`Failed to mark ticket ${id} as used:`, error);
      return ctx.internalServerError('An error occurred while updating the ticket.');
    }
  },
}));
