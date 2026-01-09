/**
 * Custom API route to resend verification email
 * POST /api/auth/send-email-confirmation
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/send-email-confirmation',
      handler: 'api::user.auth-custom.sendEmailConfirmation',
      config: {
        policies: [],
      },
    },
  ],
};
