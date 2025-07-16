module.exports = (plugin) => {
	const sanitizeUser = (user) => {
		const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;
		return sanitizedUser;
	  };

	plugin.controllers.user.me = async (ctx) => {
	  if (!ctx.state.user) {
		return ctx.unauthorized();
	  }
	  const user = await strapi.entityService.findOne(
		'plugin::users-permissions.user',
		ctx.state.user.id,
		{ populate: ['role'] }
	  );
	  ctx.body = user;
	};


	plugin.controllers.auth.callback = async (ctx) => {
		const provider = ctx.params.provider || 'local';
		const params = ctx.request.body;
	
		const store = await strapi.store({ type: 'plugin', name: 'users-permissions' });
		const grantSettings = await store.get({ key: 'grant' });
	
		const [user, jwt, error] = await strapi.plugins['users-permissions'].services.auth.authenticate(
		  provider,
		  ctx.query,
		  params,
		  grantSettings
		);
	
		if (error) {
		  return ctx.badRequest(null, error === 'array' ? error[0] : error);
		}
	
		// Fetch user with role information
		const populatedUser = await strapi.entityService.findOne(
		  'plugin::users-permissions.user',
		  user.id,
		  { populate: ['role'] }
		);
	
		ctx.send({
		  jwt,
		  user: populatedUser,
		});
	  };

	  plugin.controllers.user.register = async (ctx) => {
		const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
		const settings = await pluginStore.get({ key: 'advanced' });
	
		const params = {
		  ...ctx.request.body,
		  provider: 'local',
		};
	
		// Pastikan peran yang diberikan valid
		const role = await strapi
		  .query('plugin::users-permissions.role')
		  .findOne({ where: { id: params.role } });
	
		if (!role) {
		  return ctx.badRequest('Invalid role');
		}
	
		const user = await strapi.plugin('users-permissions').service('user').add({
		  ...params,
		  role: role.id,
		});
	
		const sanitizedUser = await strapi.plugins['users-permissions'].services.user.sanitizeUser(user);
	
		if (settings.email_confirmation) {
		  try {
			await strapi.plugins['users-permissions'].services.user.sendConfirmationEmail(sanitizedUser);
		  } catch (err) {
			return ctx.badRequest(null, err);
		  }
	
		  return ctx.send({ user: sanitizedUser });
		}
	
		const jwt = strapi.plugins['users-permissions'].services.jwt.issue(sanitizedUser);
	
		return ctx.send({
		  jwt,
		  user: sanitizedUser,
		});
	  };

	  plugin.controllers.user.customRegister = async (ctx) => {
		const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
		const settings = await pluginStore.get({ key: 'advanced' });
	  
		const params = {
		  ...ctx.request.body,
		  provider: 'local',
		};
	  
		// Validasi username dan email
		const userWithSameUsername = await strapi
		  .query('plugin::users-permissions.user')
		  .findOne({ where: { username: params.username } });
	  
		const userWithSameEmail = await strapi
		  .query('plugin::users-permissions.user')
		  .findOne({ where: { email: params.email } });
	  
		if (userWithSameUsername) {
		  return ctx.badRequest('Username already taken');
		}
	  
		if (userWithSameEmail) {
		  return ctx.badRequest('Email already taken');
		}
	  
		// Gunakan peran yang diberikan atau default ke 'user' jika tidak ada
		const roleId = params.role || 4; // 4 adalah ID untuk 'user', 3 untuk 'vendor'
	  
		const role = await strapi
		  .query('plugin::users-permissions.role')
		  .findOne({ where: { id: roleId } });
	  
		if (!role) {
		  return ctx.badRequest('Invalid role');
		}
	  
		try {
		  const user = await strapi.plugin('users-permissions').service('user').add({
			...params,
			role: role.id,
		  });
	  
		  const sanitizedUser = await strapi.contentAPI.sanitize.output(user, strapi.contentTypes['plugin::users-permissions.user'], { auth: ctx.state.auth });
	  
		  if (settings.email_confirmation) {
			try {
			  await strapi.plugins['users-permissions'].services.user.sendConfirmationEmail(sanitizedUser);
			} catch (err) {
			  return ctx.badRequest(null, err);
			}
		  }
	  
		  const jwt = strapi.plugins['users-permissions'].services.jwt.issue(sanitizedUser);
	  
		  return ctx.send({
			jwt,
			user: sanitizedUser,
		  });
		} catch (error) {
		  return ctx.badRequest(null, error.message);
		}
	  };
	  
	  plugin.routes['content-api'].routes.push({
		method: 'POST',
		path: '/auth/custom-register',
		handler: 'user.customRegister',
		config: {
		  policies: [],
		  prefix: '',
		},
	  });	  

	return plugin;
  };