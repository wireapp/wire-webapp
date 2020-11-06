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

import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {getCurrentDate} from 'Util/TimeUtil';
import {downloadBlob} from 'Util/util';
import {amplify} from 'amplify';
import ko from 'knockout';

import {ContentViewModel} from '../ContentViewModel';
import {Config} from '../../Config';

import {CancelError} from '../../backup/Error';

import 'Components/loadingBar';
import {BackupRepository} from '../../backup/BackupRepository';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';

export class HistoryExportViewModel {
  private readonly logger: Logger;
  hasError: ko.Observable<boolean>;
  private readonly state: ko.Observable<string>;
  isPreparing: ko.PureComputed<boolean>;
  isExporting: ko.PureComputed<boolean>;
  isDone: ko.PureComputed<boolean>;
  private readonly numberOfRecords: ko.Observable<number>;
  private readonly numberOfProcessedRecords: ko.Observable<number>;
  loadingProgress: ko.PureComputed<number>;
  private readonly archiveBlob: ko.Observable<Blob>;
  loadingMessage: ko.PureComputed<string>;

  static get STATE() {
    return {
      COMPRESSING: 'HistoryExportViewModel.STATE.COMPRESSING',
      DONE: 'HistoryExportViewModel.STATE.DONE',
      EXPORTING: 'HistoryExportViewModel.STATE.EXPORTING',
      PREPARING: 'HistoryExportViewModel.STATE.PREPARING',
    };
  }

  static get CONFIG() {
    return {
      FILE_EXTENSION: 'desktop_wbu',
    };
  }

  constructor(
    private readonly backupRepository: BackupRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.logger = getLogger('HistoryExportViewModel');

    this.hasError = ko.observable(false);
    this.state = ko.observable(HistoryExportViewModel.STATE.PREPARING);
    this.isPreparing = ko.pureComputed(() => {
      return !this.hasError() && this.state() === HistoryExportViewModel.STATE.PREPARING;
    });
    this.isExporting = ko.pureComputed(() => {
      const exportingStates = [HistoryExportViewModel.STATE.EXPORTING, HistoryExportViewModel.STATE.COMPRESSING];
      return !this.hasError() && exportingStates.includes(this.state());
    });
    this.isDone = ko.pureComputed(() => !this.hasError() && this.state() === HistoryExportViewModel.STATE.DONE);

    this.numberOfRecords = ko.observable(0);
    this.numberOfProcessedRecords = ko.observable(0);
    this.loadingProgress = ko.pureComputed(() => {
      return Math.floor((this.numberOfProcessedRecords() / this.numberOfRecords()) * 100);
    });

    this.archiveBlob = ko.observable(null);

    this.loadingMessage = ko.pureComputed(() => {
      switch (this.state()) {
        case HistoryExportViewModel.STATE.PREPARING: {
          return t('backupExportProgressHeadline');
        }
        case HistoryExportViewModel.STATE.EXPORTING: {
          const replacements = {
            processed: this.numberOfProcessedRecords().toString(),
            progress: this.loadingProgress().toString(),
            total: this.numberOfRecords().toString(),
          };
          return t('backupExportProgressSecondary', replacements);
        }
        case HistoryExportViewModel.STATE.COMPRESSING: {
          return t('backupExportProgressCompressing');
        }
        default:
          return '';
      }
    });

    amplify.subscribe(WebAppEvents.BACKUP.EXPORT.START, this.exportHistory);
  }

  exportHistory = async (): Promise<void> => {
    this.state(HistoryExportViewModel.STATE.PREPARING);
    this.hasError(false);
    try {
      const numberOfRecords = await this.backupRepository.getBackupInitData();
      this.logger.log(`Exporting '${numberOfRecords}' records from history`);

      this.numberOfRecords(numberOfRecords);
      this.numberOfProcessedRecords(0);
      const archiveBlob = await this.backupRepository.generateHistory(this.onProgress.bind(this));
      this.onSuccess(archiveBlob);
      this.logger.log(`Completed export of '${numberOfRecords}' records from history`);
    } catch (error) {
      this.onError(error);
    }
  };

  downloadArchiveFile = (): void => {
    const userName = this.userState.self().username();
    const fileExtension = HistoryExportViewModel.CONFIG.FILE_EXTENSION;
    const sanitizedBrandName = Config.getConfig().BRAND_NAME.replace(/[^A-Za-z0-9_]/g, '');
    const filename = `${sanitizedBrandName}-${userName}-Backup_${getCurrentDate()}.${fileExtension}`;

    this.dismissExport();
    downloadBlob(this.archiveBlob(), filename, 'application/octet-stream');
  };

  onCancel = (): void => {
    this.backupRepository.cancelAction();
  };

  onProgress = (processedNumber: number): void => {
    this.state(HistoryExportViewModel.STATE.EXPORTING);
    this.numberOfProcessedRecords(this.numberOfProcessedRecords() + processedNumber);
  };

  onError = (error: Error): void => {
    if (error instanceof CancelError) {
      this.logger.log('History export was cancelled');
      return this.dismissExport();
    }
    this.hasError(true);
    this.logger.error(`Failed to export history: ${error.message}`, error);
  };

  onSuccess = (archiveBlob: Blob): void => {
    this.state(HistoryExportViewModel.STATE.DONE);
    this.hasError(false);
    this.archiveBlob(archiveBlob);
  };

  onTryAgain = (): void => {
    this.exportHistory();
  };

  dismissExport = (): void => {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  };
}
