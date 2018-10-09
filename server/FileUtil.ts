import * as fs from 'fs';
import {promisify} from 'util';

function fileIsReadable(filePath: string): Promise<boolean> {
  return promisify(fs.access)(filePath, fs.constants.F_OK | fs.constants.R_OK)
    .then(() => true)
    .catch(() => false);
}

export {fileIsReadable};
