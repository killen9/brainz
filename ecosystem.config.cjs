module.exports = {
  apps: [{
    name: 'crm-server',
    script: 'python3',
    args: 'app.py',
    cwd: '/home/user/webapp',
    env: { PYTHONUNBUFFERED: '1' },
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}
