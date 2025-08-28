module.exports = {
  async updateBalance(ctx) {
    try {
      const { vendorId, amount, transactionId } = ctx.request.body;
      
      // Validasi input
      if (!vendorId || !amount || amount <= 0) {
        return ctx.badRequest('Invalid vendorId or amount');
      }
      
      // Cari vendor berdasarkan documentId
      const vendor = await strapi.query('plugin::users-permissions.user').findOne({
        where: { documentId: vendorId }
      });
      
      if (!vendor) {
        strapi.log.error(`Vendor not found with documentId: ${vendorId}`);
        return ctx.badRequest('Vendor not found');
      }
      
      // Ambil saldo saat ini
      const currentBalance = parseInt(vendor.saldo_active || '0');
      const newBalance = currentBalance + amount;
      
      strapi.log.info(`Updating vendor balance: ${vendorId}, current: ${currentBalance}, amount: ${amount}, new: ${newBalance}`);
      
      // Update balance vendor
      const updatedVendor = await strapi.query('plugin::users-permissions.user').update({
        where: { id: vendor.id },
        data: { saldo_active: newBalance.toString() }
      });
      
      // Log success
      strapi.log.info(`Vendor balance updated successfully: ${vendorId}, new balance: ${newBalance}`);
      
      return ctx.send({
        success: true,
        vendorId: vendorId,
        oldBalance: currentBalance,
        newBalance: newBalance,
        addedAmount: amount,
        transactionId: transactionId
      });
      
    } catch (error) {
      strapi.log.error('Error updating vendor balance:', error);
      return ctx.badRequest('Update failed', { error: error.message });
    }
  }
};
