if (process.env.NODE_ENV === 'production') {
  process.exit(0);
}

const {spawn} = require('child_process');

const child = spawn('grunt', ['init'], {
  shell: true,
  stdio: 'inherit',
});

child.on('exit', () => process.exit(0));
