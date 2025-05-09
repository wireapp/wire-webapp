import {spawnSync} from 'child_process';
import * as os from 'os';

export function getCredentials(itemName: string, fieldName: string = 'password'): string {
  const environmentVariable = process.env[itemName];
  if (!environmentVariable) {
    // if environment variable is not set search in 1password
    console.log(`Please approve 1Password prompt to read ${itemName}`);
    return readFrom1Password(itemName, fieldName);
  } else {
  }
  return environmentVariable;
}

function readFrom1Password(itemName: string, fieldName: string): string {
  const homeDir = os.homedir();
  const command = 'op';
  const args = ['item', 'get', '--vault', 'Test Automation', itemName, '--fields', fieldName, '--reveal'];
  const options = {
    cwd: homeDir,
    encoding: 'utf-8' as BufferEncoding,
  };

  const result = spawnSync(command, args, options);

  if (result.error) {
    throw new Error(`Do you have 1Password CLI installed? Starting 1Password CLI failed: ${result.error.message}`);
  }

  if (result.status === 1) {
    throw new Error(`1Password found none or multiple items for id '${itemName}':\n${result.stderr}`);
  }

  return result.stdout.trim();
}
