import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getServer } from '@abcnews/aunty/vite';

const auntyServer = getServer();
const SSL_DIR = join(homedir(), '.aunty/ssl');
const certFile = join(SSL_DIR, auntyServer.host, 'server.crt');
const keyFile = join(SSL_DIR, auntyServer.host, 'server.key');

const args = ['dev', '-p', '6006', '--ci', '--host', auntyServer.host];

if (auntyServer.https) {
  args.push('--https', '--ssl-cert', certFile, '--ssl-key', keyFile);
}

// Pass any additional CLI args passed through npm run storybook -- ...
const extraArgs = process.argv.slice(2);
if (extraArgs.length > 0) {
  args.push(...extraArgs);
}

const child = spawn('storybook', args, {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
