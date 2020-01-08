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

class ExportError extends Error {
  constructor(message = 'Something went wrong.') {
    super(message);
    Object.setPrototypeOf(this, ExportError.prototype);
  }
}

class CancelError extends Error {
  constructor(message = 'Action was cancelled') {
    super(message);
    Object.setPrototypeOf(this, CancelError.prototype);
  }
}

class ImportError extends Error {
  constructor(message = 'Something went wrong.') {
    super(message);
    Object.setPrototypeOf(this, ImportError.prototype);
  }
}

class InvalidMetaDataError extends ImportError {
  constructor(message = 'Meta data file is corrupt or missing properties.') {
    super(message);
    Object.setPrototypeOf(this, InvalidMetaDataError.prototype);
  }
}

class DifferentAccountError extends ImportError {
  constructor(message = 'You cannot restore history from a different account.') {
    super(message);
    Object.setPrototypeOf(this, DifferentAccountError.prototype);
  }
}

class IncompatibleBackupError extends ImportError {
  constructor(message = 'Backup created by incompatible database version') {
    super(message);
    Object.setPrototypeOf(this, IncompatibleBackupError.prototype);
  }
}

class IncompatiblePlatformError extends ImportError {
  constructor(message = 'Backup created by incompatible platform') {
    super(message);
    Object.setPrototypeOf(this, IncompatiblePlatformError.prototype);
  }
}

z.backup.CancelError = CancelError;
z.backup.DifferentAccountError = DifferentAccountError;
z.backup.ExportError = ExportError;
z.backup.ImportError = ImportError;
z.backup.IncompatibleBackupError = IncompatibleBackupError;
z.backup.IncompatiblePlatformError = IncompatiblePlatformError;
z.backup.InvalidMetaDataError = InvalidMetaDataError;
