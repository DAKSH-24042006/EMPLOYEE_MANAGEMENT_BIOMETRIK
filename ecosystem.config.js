module.exports = {
  apps: [{
    name: 'requirement-dashboard-5018',
    script: "server.js",
    cwd: '/home/ubuntu/apps/requirement-dashboard',
    exec_mode: 'fork',
    instances: 1,
    env: { NODE_ENV: 'production', PORT: 5018 },
  }]
}