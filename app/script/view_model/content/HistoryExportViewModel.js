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

  constructor() {
    this.hasError = ko.observable(true);
    this.state = ko.observable(HistoryExportViewModel.STATE.DONE);
    this.isPreparing = ko.pureComputed(
      () => !this.hasError() && this.state() === HistoryExportViewModel.STATE.PREPARING
    );
    this.isExporting = ko.pureComputed(
      () => !this.hasError() && this.state() === HistoryExportViewModel.STATE.EXPORTING
    );
    this.isDone = ko.pureComputed(() => !this.hasError() && this.state() === HistoryExportViewModel.STATE.DONE);
    this.loadingProgress = ko.observable(20);
  }

  onCancel() {}

  onProgress() {}

  onError() {}

  onSuccess() {}
};
