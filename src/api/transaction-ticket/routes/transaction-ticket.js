'use strict';

/**
 * transaction-ticket router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::transaction-ticket.transaction-ticket', {
  config: {
    sendTickets: {
      policies: ['global::isAuthenticated'],
      middlewares: [],
    },
    verifyQR: {
      policies: [],
      middlewares: [],
    },
  },
  routes: [
    {
      method: 'POST',
      path: '/transaction-tickets/sendTickets',
      handler: 'transaction-ticket.sendTickets',
      config: {
        policies: ['global::isAuthenticated'],
      },
    },
    {
      method: 'POST',
      path: '/transaction-tickets/verifyQR',
      handler: 'transaction-ticket.verifyQR',
      config: {
        policies: [],
      },
    },
  ],
});
