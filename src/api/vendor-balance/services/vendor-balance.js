module.exports = {
  async updateVendorBalance(vendorId, amount, transactionId = null) {
    try {
      // Cari vendor berdasarkan documentId
      const vendor = await strapi.query('plugin::users-permissions.user').findOne({
        where: { documentId: vendorId }
      });
      
      if (!vendor) {
        throw new Error(`Vendor not found with documentId: ${vendorId}`);
      }
      
      // Ambil saldo saat ini
      const currentBalance = parseInt(vendor.saldo_active || '0');
      const newBalance = currentBalance + amount;
      
      // Update balance vendor
      const updatedVendor = await strapi.query('plugin::users-permissions.user').update({
        where: { id: vendor.id },
        data: { saldo_active: newBalance.toString() }
      });
      
      return {
        success: true,
        vendorId: vendorId,
        oldBalance: currentBalance,
        newBalance: newBalance,
        addedAmount: amount,
        transactionId: transactionId
      };
      
    } catch (error) {
      strapi.log.error('Service error updating vendor balance:', error);
      throw error;
    }
  }
};
