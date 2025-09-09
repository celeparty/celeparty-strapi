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
  
		if (data.saldo_refund !== undefined) {
			console.log("Before Update - saldo_refund:", data.saldo_refund, "User ID:", where.id);
		}
	},
  
	async afterUpdate(event) {
		const { result } = event; // hasil akhir setelah update
  
		if (result.saldo_refund !== undefined) {
			console.log("After Update - saldo_refund:", result.saldo_refund, "User ID:", result.id);
		}
	},
};
  