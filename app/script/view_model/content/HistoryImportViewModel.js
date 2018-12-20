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

import JSZip from 'jszip';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.HistoryImportViewModel = class HistoryImportViewModel {
  static get STATE() {
    return {
      DONE: 'HistoryImportViewModel.STATE.DONE',
      IMPORTING: 'HistoryImportViewModel.STATE.IMPORTING',
      PREPARING: 'HistoryImportViewModel.STATE.PREPARING',
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.backupRepository = repositories.backup;

    this.logger = new z.util.Logger('z.viewModel.content.HistoryExportViewModel', z.config.LOGGER.OPTIONS);

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
          return z.l10n.text(z.string.backupImportProgressHeadline);
        }
        case HistoryImportViewModel.STATE.IMPORTING: {
          const replacements = {
            processed: this.numberOfProcessedRecords(),
            progress: this.loadingProgress(),
            total: this.numberOfRecords(),
          };
          return z.l10n.text(z.string.backupImportProgressSecondary, replacements);
        }
        default:
          return '';
      }
    });

    this.error.subscribe(error => {
      if (!error) {
        this.errorHeadline('');
        this.errorSecondary('');
      } else if (error instanceof z.backup.DifferentAccountError) {
        this.errorHeadline(z.l10n.text(z.string.backupImportAccountErrorHeadline));
        this.errorSecondary(z.l10n.text(z.string.backupImportAccountErrorSecondary));
      } else if (error instanceof z.backup.IncompatibleBackupError) {
        this.errorHeadline(z.l10n.text(z.string.backupImportVersionErrorHeadline));
        this.errorSecondary(z.l10n.text(z.string.backupImportVersionErrorSecondary));
      } else {
        this.errorHeadline(z.l10n.text(z.string.backupImportGenericErrorHeadline));
        this.errorSecondary(z.l10n.text(z.string.backupImportGenericErrorSecondary));
      }
    });

    amplify.subscribe(z.event.WebApp.BACKUP.IMPORT.START, this.importHistory.bind(this));
  }

  importHistory(file) {
    this.state(HistoryImportViewModel.STATE.PREPARING);
    this.error(null);
    JSZip.loadAsync(file)
      .then(archive => this.backupRepository.importHistory(archive, this.onInit.bind(this), this.onProgress.bind(this)))
      .then(this.onSuccess.bind(this))
      .catch(this.onError.bind(this));
  }

  onInit(numberOfRecords) {
    this.state(HistoryImportViewModel.STATE.IMPORTING);
    this.numberOfRecords(numberOfRecords);
    this.numberOfProcessedRecords(0);
  }

  onProgress(numberProcessed) {
    this.numberOfProcessedRecords(this.numberOfProcessedRecords() + numberProcessed);
  }

  onSuccess() {
    this.error(null);
    this.state(HistoryImportViewModel.STATE.DONE);
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.HISTORY.RESTORE_SUCCEEDED);
    window.setTimeout(this.dismissImport.bind(this), z.motion.MotionDuration.X_LONG * 2);
  }

  onCancel() {
    this.backupRepository.cancelAction();
  }

  dismissImport() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  }

  onError(error) {
    if (error instanceof z.backup.CancelError) {
      this.logger.log(`History import was cancelled`);
      return this.dismissImport();
    }
    this.error(error);
    this.logger.error(`Failed to import history: ${error.message}`, error);
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.HISTORY.RESTORE_FAILED);
  }
};
