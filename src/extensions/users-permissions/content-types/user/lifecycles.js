module.exports = {
	async beforeCreate(event) {
		console.log("Before Create - saldo_refund:");
		const { data } = event.params;
  
		if (data.saldo_refund !== undefined) {
			console.log("Before Create - saldo_refund:", data.saldo_refund);
		}
	},
  
	async beforeUpdate(event) {
		const { data, where } = event.params;
  
		// Simpan nilai lama saldo_refund untuk perbandingan
		if (data.saldo_refund !== undefined && where.id) {
			try {
				const currentUser = await strapi.entityService.findOne('plugin::users-permissions.user', where.id);
				event.state = {
					...event.state,
					oldSaldoRefund: currentUser.saldo_refund
				};
				console.log("Before Update - saldo_refund:", data.saldo_refund, "Old saldo_refund:", currentUser.saldo_refund, "User ID:", where.id);
			} catch (error) {
				console.log("Error getting old saldo_refund:", error);
			}
		}
	},
  
	async afterUpdate(event) {
		const { result, state } = event;
		console.log("After Update - result:", result);
		
		// Hanya kirim email jika saldo_refund benar-benar berubah
		if (result.saldo_refund !== undefined && state.oldSaldoRefund !== undefined) {
			const oldValue = parseFloat(state.oldSaldoRefund || 0);
			const newValue = parseFloat(result.saldo_refund || 0);
			
			// Cek apakah nilai benar-benar berubah
			if (oldValue !== newValue) {
				console.log("After Update - saldo_refund changed:", oldValue, "->", newValue, "User ID:", result.id);
				
				// Kirim email notifikasi hanya jika ada perubahan
				try {
					await sendSaldoRefundNotification(result);
				} catch (error) {
					console.error("Error sending saldo_refund notification:", error);
				}
			} else {
				console.log("After Update - saldo_refund unchanged:", newValue, "User ID:", result.id);
			}
		}
	},
};

// Fungsi untuk mengirim email notifikasi
async function sendSaldoRefundNotification(user) {
	try {
		// Email template untuk user
		const isRefundCompleted = parseFloat(user.saldo_refund || 0) === 0;
		const userEmailTemplate = {
			to: user.email,
			subject: isRefundCompleted ? 'Refund Selesai Diproses - Celeparty' : 'Perubahan Saldo Refund - Celeparty',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #333;">${isRefundCompleted ? 'Refund Selesai Diproses' : 'Perubahan Saldo Refund'}</h2>
					<p>Halo ${user.name || user.username},</p>
					<p>${isRefundCompleted ? 'Proses Refund selesai diproses.' : 'Saldo refund Anda sedang diproses:'}</p>
					<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
						<p><strong>Saldo Refund:</strong> Rp ${parseFloat(user.saldo_refund || 0).toLocaleString('id-ID')}</p>
					</div>
					<p>Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.</p>
					<p>Terima kasih,<br>Tim Celeparty</p>
				</div>
			`,
		};

		// Email template untuk admin
		const adminEmailTemplate = {
			to: 'celeparty.id@gmail.com',
			subject: `Notifikasi Admin - Saldo Refund an ${user.name || user.username}`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #333;">Notifikasi Admin - Perubahan Saldo Refund</h2>
					<p>Ada perubahan saldo refund untuk user berikut:</p>
					<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
						<p><strong>User ID:</strong> ${user.id}</p>
						<p><strong>Nama:</strong> ${user.name || user.username}</p>
						<p><strong>Email:</strong> ${user.email}</p>
						<p><strong>Saldo Refund:</strong> Rp ${parseFloat(user.saldo_refund || 0).toLocaleString('id-ID')}</p>
						<p><strong>Status:</strong> ${isRefundCompleted ? 'Refund Selesai Diproses' : 'Refund Sedang Diproses'}</p>
						<p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID')}</p>
					</div>
					<p>Silakan periksa perubahan ini di admin panel.</p>
					<p>Tim Celeparty</p>
				</div>
			`,
		};

		// Kirim email ke user
		await strapi.plugins['email'].services.email.send(userEmailTemplate);
		console.log(`Email notification sent to ${user.email} for saldo_refund change`);
		
		// Kirim email ke admin
		await strapi.plugins['email'].services.email.send(adminEmailTemplate);
		console.log(`Admin notification sent to celeparty.id@gmail.com for user ${user.id} saldo_refund change`);
		
	} catch (error) {
		console.error('Failed to send saldo_refund notification email:', error);
		throw error;
	}
}