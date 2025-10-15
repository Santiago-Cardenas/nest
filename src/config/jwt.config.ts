export default () => ({
	JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret',
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
});
