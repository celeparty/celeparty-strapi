/**
 * Custom controller for email confirmation
 */

module.exports = {
  /**
   * Send confirmation email
   * POST /api/auth/send-email-confirmation
   */
  async sendEmailConfirmation(ctx) {
    try {
      const { email } = ctx.request.body;

      // Validate email
      if (!email) {
        return ctx.badRequest('Email is required');
      }

      // Find user by email
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email }
      });

      if (!user) {
        return ctx.badRequest('User not found');
      }

      // Check if already confirmed
      if (user.confirmed) {
        return ctx.badRequest('User is already verified');
      }

      // Send confirmation email using Strapi's built-in service
      try {
        await strapi.plugin('users-permissions').service('user').sendConfirmationEmail(user);
        
        return ctx.send({
          success: true,
          message: 'Verification email sent successfully',
          user: {
            id: user.id,
            email: user.email,
            username: user.username
          }
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        return ctx.internalServerError('Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Error in sendEmailConfirmation:', error);
      return ctx.internalServerError(error.message);
    }
  },
};
