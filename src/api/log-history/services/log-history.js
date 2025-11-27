'use strict';

/**
 * log-history service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::log-history.log-history');
