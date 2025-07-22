module.exports = ({env}) => ({
  'users-permissions': {  
    config: {  
      register: {  
        allowedFields: ["role", "phone", "address", "name", "birthplace", "birthdate", "nik", "companyName", "serviceLocation", "bankName", "accountNumber", "accountName", "transactions","saldo_active","saldo_refund"],
      },  
      jwt: {
        expiresIn: '7d',
      },
      rest: {
        defaultLimit: 25,
        maxLimit: 100,
      },      
      populateCreatorFields: true,
    },  
  },

  email: {
    config: {
      provider: 'strapi-provider-email-resend',
      providerOptions: {
        apiKey: env('RESEND_API_KEY'), // Required
      },
      settings: {
        defaultFrom: 'Celeparty <noreply@celeparty.com>',
        defaultReplyTo: 'noreply@celeparty.com',
      },
    }
  }, 


  // email: {
  //   config: {
  //       provider: 'strapi-provider-email-resend',
  //       providerOptions: {
  //           apiKey: env('RESEND_API_KEY'), // Required
  //       },
  //       settings: {
  //           defaultFrom: "noreplay@planetdekor.id",
  //           defaultReplyTo: "noreplay@planetdekor.id",
  //       },
  //   },
// },



});
