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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import ko from 'knockout';

import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {loadFileBuffer} from 'Util/util';
import {WebWorker} from 'Util/worker';
import 'Components/loadingBar';

import {Config} from '../../Config';
import {MotionDuration} from '../../motion/MotionDuration';
import {ContentViewModel} from '../ContentViewModel';
import {CancelError, DifferentAccountError, ImportError, IncompatibleBackupError} from '../../backup/Error';
import {BackupRepository} from '../../backup/BackupRepository';
import {formatDuration} from '../../util/TimeUtil';

export class HistoryImportViewModel {
  private readonly error: ko.Observable<Error>;
  private readonly errorHeadline: ko.Observable<string>;
  private readonly errorSecondary: ko.Observable<string>;
  private readonly loadingProgress: ko.PureComputed<number>;
  private readonly logger: Logger;
  private readonly numberOfProcessedRecords: ko.Observable<number>;
  private readonly numberOfRecords: ko.Observable<number>;
  private readonly state: ko.Observable<string>;
  readonly isDone: ko.PureComputed<boolean>;
  readonly isImporting: ko.PureComputed<boolean>;
  readonly isPreparing: ko.PureComputed<boolean>;
  readonly loadingMessage: ko.PureComputed<string>;

  static get STATE() {
    return {
      DONE: 'HistoryImportViewModel.STATE.DONE',
      IMPORTING: 'HistoryImportViewModel.STATE.IMPORTING',
      PREPARING: 'HistoryImportViewModel.STATE.PREPARING',
    };
  }

  constructor(private readonly backupRepository: BackupRepository) {
    this.logger = getLogger('HistoryImportViewModel');

    this.error = ko.observable(null);
    this.errorHeadline = ko.observable('');
    this.errorSecondary = ko.observable('');

    this.state = ko.observable(HistoryImportViewModel.STATE.PREPARING);
    this.isPreparing = ko.pureComputed(() => !this.error() && this.state() === HistoryImportViewModel.STATE.PREPARING);
    this.isImporting = ko.pureComputed(() => !this.error() && this.state() === HistoryImportViewModel.STATE.IMPORTING);
    this.isDone = ko.pureComputed(() => !this.error() && this.state() === HistoryImportViewModel.STATE.DONE);

    this.numberOfRecords = ko.observable(0);
    this.numberOfProcessedRecords = ko.observable(0);
    this.loadingProgress = ko.pureComputed(() => {
      return Math.floor((this.numberOfProcessedRecords() / this.numberOfRecords()) * 100);
    });

    this.loadingMessage = ko.pureComputed(() => {
      switch (this.state()) {
        case HistoryImportViewModel.STATE.PREPARING: {
          return t('backupImportProgressHeadline');
        }
        case HistoryImportViewModel.STATE.IMPORTING: {
          const replacements = {
            processed: this.numberOfProcessedRecords().toString(),
            progress: this.loadingProgress().toString(),
            total: this.numberOfRecords().toString(),
          };
          return t('backupImportProgressSecondary', replacements);
        }
        default:
          return '';
      }
    });

    this.error.subscribe(error => {
      if (!error) {
        this.errorHeadline('');
        this.errorSecondary('');
      } else if (error instanceof DifferentAccountError) {
        this.errorHeadline(t('backupImportAccountErrorHeadline'));
        this.errorSecondary(t('backupImportAccountErrorSecondary'));
      } else if (error instanceof IncompatibleBackupError) {
        this.errorHeadline(t('backupImportVersionErrorHeadline'));
        this.errorSecondary(t('backupImportVersionErrorSecondary', Config.getConfig().BRAND_NAME));
      } else {
        this.errorHeadline(t('backupImportGenericErrorHeadline'));
        this.errorSecondary(t('backupImportGenericErrorSecondary'));
      }
    });

    amplify.subscribe(WebAppEvents.BACKUP.IMPORT.START, this.importHistory);
  }

  importHistory = async (file: File): Promise<void> => {
    this.state(HistoryImportViewModel.STATE.PREPARING);
    this.error(null);
    const fileBuffer = await loadFileBuffer(file);
    const worker = new WebWorker('/worker/jszip-unpack-worker.js');

    try {
      const unzipTimeStart = performance.now();
      const files = await worker.post<Record<string, Uint8Array>>(fileBuffer);
      const unzipTimeEnd = performance.now();
      if (files.error) {
        throw new ImportError((files.error as unknown) as string);
      }
      const unzipTimeMillis = Math.round(unzipTimeEnd - unzipTimeStart);
      const unzipTimeFormatted = formatDuration(unzipTimeMillis);

      this.logger.log(
        `Unzipped '${Object.keys(files).length}' files for history import (took ${unzipTimeFormatted.text}).`,
        files,
      );
      await this.backupRepository.importHistory(files, this.onInit, this.onProgress);
      this.onSuccess();
    } catch (error) {
      this.onError(error);
    }
  };

  onInit = (numberOfRecords: number): void => {
    this.state(HistoryImportViewModel.STATE.IMPORTING);
    this.numberOfRecords(numberOfRecords);
    this.numberOfProcessedRecords(0);
  };

  onProgress = (numberProcessed: number): void => {
    this.numberOfProcessedRecords(this.numberOfProcessedRecords() + numberProcessed);
  };

  onSuccess = (): void => {
    this.error(null);
    this.state(HistoryImportViewModel.STATE.DONE);
    window.setTimeout(this.dismissImport, MotionDuration.X_LONG * 2);
  };

  onCancel = (): void => {
    this.backupRepository.cancelAction();
  };

  dismissImport = (): void => {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  };

  onError = (error: Error): void => {
    if (error instanceof CancelError) {
      this.logger.log('History import was cancelled');
      return this.dismissImport();
    }
    this.error(error);
    this.logger.error(`Failed to import history: ${error.message}`, error);
  };
}
