import * as fs from 'fs';
import {promisify} from 'util';

function fileIsReadable(filePath: string, synchronous: true): boolean;
function fileIsReadable(filePath: string, synchronous?: false): Promise<boolean>;
function fileIsReadable(filePath: string, synchronous = false): Promise<boolean> | boolean {
  if (synchronous) {
    try {
      fs.accessSync(filePath, fs.constants.F_OK | fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }
  return promisify(fs.access)(filePath, fs.constants.F_OK | fs.constants.R_OK)
    .then(() => true)
    .catch(() => false);
}

function readFile(filePath: string, synchronous: true): string;
function readFile(filePath: string, synchronous?: false): Promise<string>;
function readFile(filePath: string, synchronous = false): Promise<string> | string {
  return synchronous
    ? fs.readFileSync(filePath, {encoding: 'utf-8'})
    : promisify(fs.readFile)(filePath, {encoding: 'utf-8'});
}

export {fileIsReadable, readFile};
