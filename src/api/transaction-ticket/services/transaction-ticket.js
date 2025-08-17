'use strict';

/**
 * transaction-ticket service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::transaction-ticket.transaction-ticket');
