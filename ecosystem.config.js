module.exports = {
  apps: [
    {
      name: 'biometrik-workspace',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p ' + (process.env.PORT || 5018),
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5018,
      },
    },
  ],
};