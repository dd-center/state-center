module.exports = {
  apps: [{
    interpreter: './node_modules/.bin/ts-node',
    interpreter_args: '-r tsconfig-paths/register',
    name: 'state center',
    script: 'src/index.ts',
    instances: 1,
    autorestart: true,
    watch: false,
  }],
}
