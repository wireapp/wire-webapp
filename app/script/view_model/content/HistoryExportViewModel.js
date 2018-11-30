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
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.HistoryExportViewModel = class HistoryExportViewModel {
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

  constructor(mainViewModel, contentViewModel, repositories) {
    this.backupRepository = repositories.backup;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.content.HistoryExportViewModel', z.config.LOGGER.OPTIONS);

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
          return z.l10n.text(z.string.backupExportProgressHeadline);
        }
        case HistoryExportViewModel.STATE.EXPORTING: {
          const replacements = {
            processed: this.numberOfProcessedRecords(),
            progress: this.loadingProgress(),
            total: this.numberOfRecords(),
          };
          return z.l10n.text(z.string.backupExportProgressSecondary, replacements);
        }
        case HistoryExportViewModel.STATE.COMPRESSING: {
          return z.l10n.text(z.string.backupExportProgressCompressing);
        }
        default:
          return '';
      }
    });

    amplify.subscribe(z.event.WebApp.BACKUP.EXPORT.START, this.exportHistory.bind(this));
  }

  exportHistory() {
    this.state(HistoryExportViewModel.STATE.PREPARING);
    this.hasError(false);
    this.backupRepository.getBackupInitData().then(numberOfRecords => {
      this.logger.log(`Exporting '${numberOfRecords}' records from history`);

      this.numberOfRecords(numberOfRecords);
      this.numberOfProcessedRecords(0);

      this.backupRepository
        .generateHistory(this.onProgress.bind(this))
        .then(archive => {
          this.state(HistoryExportViewModel.STATE.COMPRESSING);
          return archive.generateAsync({compression: 'DEFLATE', type: 'blob'});
        })
        .then(archiveBlob => {
          this.onSuccess(archiveBlob);
          this.logger.log(`Completed export of '${numberOfRecords}' records from history`);
        })
        .catch(this.onError.bind(this));
    });
  }

  downloadArchiveFile() {
    const userName = this.userRepository.self().username();
    const fileExtension = HistoryExportViewModel.CONFIG.FILE_EXTENSION;
    const filename = `Wire-${userName}-Backup_${z.util.TimeUtil.getCurrentDate()}.${fileExtension}`;

    this.dismissExport();
    z.util.downloadBlob(this.archiveBlob(), filename, 'application/octet-stream');
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.HISTORY.BACKUP_SUCCEEDED);
  }

  onCancel() {
    this.backupRepository.cancelAction();
  }

  onProgress(processedNumber) {
    this.state(HistoryExportViewModel.STATE.EXPORTING);
    this.numberOfProcessedRecords(this.numberOfProcessedRecords() + processedNumber);
  }

  onError(error) {
    if (error instanceof z.backup.CancelError) {
      this.logger.log(`History export was cancelled`);
      return this.dismissExport();
    }
    this.hasError(true);
    this.logger.error(`Failed to export history: ${error.message}`, error);
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.HISTORY.BACKUP_FAILED);
  }

  onSuccess(archiveBlob) {
    this.state(HistoryExportViewModel.STATE.DONE);
    this.hasError(false);
    this.archiveBlob(archiveBlob);
  }

  onTryAgain() {
    this.exportHistory();
  }

  dismissExport() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  }
};
