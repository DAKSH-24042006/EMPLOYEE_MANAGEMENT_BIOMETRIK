module.exports = {
  apps: [
    {
      name: 'requirement-dashboard',
      script: 'server.js',
      cwd: '/home/ubuntu/apps/requirement-dashboard',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5018
      },
    },
  ],
};