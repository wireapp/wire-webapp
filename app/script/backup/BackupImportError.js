/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

window.z = window.z || {};
window.z.backup = z.backup || {};

z.backup.importError = (() => {
  class BackupImportError extends Error {
    constructor(message = 'Something went wrong.') {
      super(message);
      Object.setPrototypeOf(this, BackupImportError.prototype);
    }
  }

  class InvalidMetaDataError extends BackupImportError {
    constructor(message = 'Meta data file is corrupt or missing properties.') {
      super(message);
      Object.setPrototypeOf(this, InvalidMetaDataError.prototype);
    }
  }

  class DifferentAccountError extends BackupImportError {
    constructor(message = 'You cannot restore history from a different account.') {
      super(message);
      Object.setPrototypeOf(this, DifferentAccountError.prototype);
    }
  }

  class IncompatibleBackupError extends BackupImportError {
    constructor(message = 'Backup created by incompatible database version') {
      super(message);
      Object.setPrototypeOf(this, IncompatibleBackupError.prototype);
    }
  }

  return {
    BackupImportError,
    DifferentAccountError,
    IncompatibleBackupError,
    InvalidMetaDataError,
  };
})();
