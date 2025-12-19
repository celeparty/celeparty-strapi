'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/ticket-verifications/verifyByCode/:code',
      handler: 'custom.verifyByCode',
      config: {
        policies: [],
        auth: false, // Or set to true and add policies if only authenticated users can verify
      },
    },
    {
      method: 'PUT',
      path: '/ticket-verifications/markAsUsed/:id',
      handler: 'custom.markAsUsed',
      config: {
        policies: [],
        auth: false, // Or set to true and add policies if only authenticated users can verify
      },
    },
  ],
};
