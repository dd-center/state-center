module.exports = {
  apps: [{
    name: 'state center',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false
  }]
}
