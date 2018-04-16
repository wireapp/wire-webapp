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

z.viewModel.content.HistoryImportViewModel = class HistoryImportViewModel {
  static get STATE() {
    return {
      DONE: 'DONE',
      IMPORTING: 'IMPORTING',
      PREPARING: 'PREPARING',
    };
  }

  constructor() {
    this.hasError = ko.observable(false);
    this.state = ko.observable(HistoryImportViewModel.STATE.DONE);
    this.isPreparing = ko.pureComputed(
      () => !this.hasError() && this.state() === HistoryImportViewModel.STATE.PREPARING
    );
    this.isImporting = ko.pureComputed(
      () => !this.hasError() && this.state() === HistoryImportViewModel.STATE.IMPORTING
    );
    this.isDone = ko.pureComputed(() => !this.hasError() && this.state() === HistoryImportViewModel.STATE.DONE);
  }
};
