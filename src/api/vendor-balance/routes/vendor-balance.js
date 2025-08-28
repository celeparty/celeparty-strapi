module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/vendor-balance/update',
      handler: 'vendor-balance.updateBalance',
      config: {
        auth: false, // Karena dipanggil dari webhook
      },
    },
  ],
};
