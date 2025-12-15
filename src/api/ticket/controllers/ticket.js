'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ticket.ticket', {

  async create(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const { data } = ctx.request.body;
    if (!data) return ctx.badRequest('Data is required');

    data.users_permissions_user = userId;
    data.publishedAt = null;

    return await super.create(ctx);
  },

  async update(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const ticket = await strapi.entityService.findOne(
      'api::ticket.ticket',
      ctx.params.id,
      { fields: ['id', 'users_permissions_user'] }
    );

    if (!ticket || ticket.users_permissions_user !== userId) {
      return ctx.forbidden();
    }

    ctx.request.body.data.users_permissions_user = userId;
    return await super.update(ctx);
  },

  async find(ctx) {
    const userId = ctx.state.user?.id;

    if (userId) {
      ctx.query.filters = {
        ...(ctx.query.filters || {}),
        users_permissions_user: userId,
      };
    }

    // ⛔ hapus filter ilegal (penyebab Invalid key)
    if (ctx.query.filters?.product) {
      delete ctx.query.filters.product;
    }

    ctx.query.populate = {
      event: true,
      ticket_type: true,
    };

    return await super.find(ctx);
  },

  async findOne(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const ticket = await strapi.entityService.findOne(
      'api::ticket.ticket',
      ctx.params.id,
      {
        populate: {
          event: true,
          ticket_type: true,
          order: true,
        },
      }
    );

    if (!ticket || ticket.users_permissions_user !== userId) {
      return ctx.notFound();
    }

    ctx.body = { data: ticket };
  },

  async delete(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const ticket = await strapi.entityService.findOne(
      'api::ticket.ticket',
      ctx.params.id,
      { fields: ['id', 'users_permissions_user'] }
    );

    if (!ticket || ticket.users_permissions_user !== userId) {
      return ctx.forbidden();
    }

    return await super.delete(ctx);
  },
});
