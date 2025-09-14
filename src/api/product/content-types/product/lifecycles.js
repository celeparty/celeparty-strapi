module.exports = {
  async beforeUpdate(event) {
    const { where, data } = event.params;

    const existingProduct = await strapi.entityService.findOne('api::product.product', where.id, {
      populate: ['users_permissions_user'],
    });

    event.state = {
      wasUnpublished: !existingProduct.publishedAt,
      wasNotRejected: existingProduct.state !== 'rejected',
      userEmail: existingProduct.users_permissions_user?.email,
      isStockUpdate: data.variant && !data.state && !data.publishedAt, // Deteksi update stok (ada variant tapi tidak ada state dan tidak ada publishedAt)
    };
  },

  async afterUpdate(event) {
    const { result, state } = event;
    const isNowPublished = !!result.publishedAt;

    // Skip email notifications untuk update stok
    if (state.isStockUpdate) {
      console.log('Stock update detected, skipping email notifications');
      return;
    }

    // CASE: Dipublish
    if (result.state ==="approved") {
      if (state.userEmail) {
        await strapi.plugins['email'].services.email.send({
          to: state.userEmail,
          subject: 'Produk Anda Telah Dipublikasikan',
          html: `
            <div>
              <h2>Produk Anda Telah Dipublikasikan</h2>
              <p>Produk dengan nama <strong>${result.title}</strong> telah berhasil dipublikasikan.</p>
            </div>
          `,
        });
      }
    }

    console.log({state})
    console.log({result})

    // CASE: Ditolak
    if (result.state === 'rejected') {
      if (state.userEmail) {
        await strapi.plugins['email'].services.email.send({
          to: state.userEmail,
          subject: 'Produk Anda Ditolak',
          html: `
            <div>
              <h2>Produk Anda Ditolak</h2>
              <p>Produk dengan nama <strong>${result.title}</strong> telah ditolak setelah proses review.</p>
            </div>
          `,
        });
      }
    }
  },
};