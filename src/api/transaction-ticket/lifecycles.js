module.exports = {
  async afterUpdate(event) {
    const { result, params } = event;

    // Check if the payment_status was updated to 'paid'
    // The exact value 'paid' might need to be adjusted based on the actual value from the payment gateway.
    if (params.data.payment_status === 'paid') {
      strapi.log.info(`Processing successful payment for transaction-ticket ID: ${result.id}`);
      try {
        // Calling a custom service to handle the ticket generation logic
        await strapi.service('api::ticket.generator').generateFromTransaction(result);
      } catch (error) {
        strapi.log.error(`Failed to generate ticket for transaction-ticket ID: ${result.id}`, error);
        // We might want to handle this error more gracefully,
        // e.g., by sending a notification to the admin
      }
    }
  },
};
