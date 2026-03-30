module.exports = {
    apps: [{
        name: '{{PROJECT_NAME}}-{{PORT}}',
        script: "node_modules/next/dist/bin/next",
        args: "start -p {{PORT}}",
        cwd: '/home/ubuntu/apps/{{PROJECT_NAME}}',
        exec_mode: 'fork',
        instances: 1,
        env: {
            NODE_ENV: 'production'
        },
    }]
}