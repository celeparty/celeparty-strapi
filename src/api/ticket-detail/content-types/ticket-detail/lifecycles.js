module.exports = {
  async afterCreate(event) {
    // Lifecycle for ticket-detail creation
    strapi.log.info(`Ticket detail created with barcode: ${event.result.barcode}`);
  },

  async beforeUpdate(event) {
    // Track status changes
    const { params, state } = event;
    if (params.where && params.where.id) {
      try {
        const currentRecord = await strapi.entityService.findOne('api::ticket-detail.ticket-detail', params.where.id);
        state.oldStatus = currentRecord.status;
      } catch (error) {
        console.log('Error getting old status:', error);
      }
    }
  },

  async afterUpdate(event) {
    const { result, state } = event;
    // Log status changes
    if (state.oldStatus !== result.status) {
      strapi.log.info(`Ticket detail ${result.barcode} status changed from ${state.oldStatus} to ${result.status}`);
    }
  },
};
