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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.HistoryExportViewModel = class HistoryExportViewModel {
  static get STATE() {
    return {
      DONE: 'DONE',
      EXPORTING: 'EXPORTING',
      PREPARING: 'PREPARING',
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.hasError = ko.observable(false);
    this.state = ko.observable(HistoryExportViewModel.STATE.PREPARING);
    this.isPreparing = ko.pureComputed(
      () => !this.hasError() && this.state() === HistoryExportViewModel.STATE.PREPARING
    );
    this.isExporting = ko.pureComputed(
      () => !this.hasError() && this.state() === HistoryExportViewModel.STATE.EXPORTING
    );
    this.isDone = ko.pureComputed(() => !this.hasError() && this.state() === HistoryExportViewModel.STATE.DONE);

    this.numberOfRecords = ko.observable(0);
    this.numberOfProcessedRecords = ko.observable(0);
    this.loadingProgress = ko.pureComputed(() => this.numberOfProcessedRecords() / this.numberOfRecords() * 100);

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
        default:
          return '';
      }
    });

    this.mainViewModel = mainViewModel;
    this.backupRepository = repositories.backup;

    amplify.subscribe(z.event.WebApp.BACKUP.EXPORT.START, this.exportHistory.bind(this));
  }

  exportHistory() {
    const {numberOfRecords, userName} = this.backupRepository.getBackupInitData();
    this.numberOfRecords(numberOfRecords);

    this.backupRepository
      .generateHistory(this.onProgress.bind(this))
      .then(archive => archive.generateAsync({type: 'blob'}))
      .then(archiveBlob => {
        const timestamp = new Date().toISOString().substring(0, 10);
        const filename = `Wire-${userName}-Backup_${timestamp}.desktop_wbu`;
        this.onSuccess();

        z.util.downloadBlob(archiveBlob, filename);
      })
      .catch(this.onError.bind(this));
  }

  onCancel() {
    amplify.publish(z.event.WebApp.BACKUP.EXPORT.CANCEL);
    this.backupRepository.cancelAction();
  }

  onInit(numberOfRecords) {
    this.state(HistoryExportViewModel.STATE.PREPARING);
    this.numberOfRecords(numberOfRecords);
    this.numberOfProcessedRecords(0);
    this.hasError(false);
  }

  onProgress(processedNumber) {
    this.state(HistoryExportViewModel.STATE.EXPORTING);
    this.numberOfProcessedRecords(this.numberOfProcessedRecords() + processedNumber);
  }

  onError(error) {
    if (error instanceof z.backup.CancelError) {
      return this.dismissExport();
    }
    this.hasError(true);
  }

  onSuccess(data) {
    this.state(HistoryExportViewModel.STATE.DONE);
    this.hasError(false);
  }

  onTryAgain() {
    this.exportHistory();
  }

  dismissExport() {
    this.mainViewModel.content.switchPreviousContent();
  }
};
