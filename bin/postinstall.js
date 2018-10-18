const logger = require('logdown')('postinstall');
logger.state.isEnabled = true;

if (process.env.NODE_ENV === 'production') {
  logger.log('Skipping "grunt init" because it is not needed in a production environment.');
  process.exit(0);
}

const {spawn} = require('child_process');

const child = spawn('grunt', ['init'], {
  shell: true,
  stdio: 'inherit',
});

child.on('exit', () => process.exit(0));
