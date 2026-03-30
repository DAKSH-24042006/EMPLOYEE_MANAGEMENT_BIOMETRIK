module.exports = {
  apps: [{
    name: 'marketing-dashboard-5018',
    script: "node_modules/next/dist/bin/next",
    args: "start -p 5018",
    cwd: '/home/ubuntu/apps/marketing-dashboard',
    exec_mode: 'fork',
    instances: 1,
    env: { NODE_ENV: 'production' },
  }]
}