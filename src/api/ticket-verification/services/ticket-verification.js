'use strict';

/**
 * ticket-verification service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::ticket-verification.ticket-verification');
