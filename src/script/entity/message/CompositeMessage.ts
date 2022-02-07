/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import ko from 'knockout';

import {ContentMessage} from './ContentMessage';

export class CompositeMessage extends ContentMessage {
  errorButtonId: ko.Observable<string | undefined>;
  errorMessage: ko.Observable<string>;
  selectedButtonId: ko.Observable<string | undefined>;
  waitingButtonId: ko.Observable<string | undefined>;

  constructor(id?: string) {
    super(id);
    this.selectedButtonId = ko.observable();
    this.waitingButtonId = ko.observable();
    this.errorButtonId = ko.observable();
    this.errorMessage = ko.observable('');
  }

  getSelectionChange(buttonId: string): false | {selected_button_id: string; version: number} {
    this.waitingButtonId(undefined);
    if (this.selectedButtonId() === buttonId) {
      return false;
    }
    this.selectedButtonId(buttonId);
    return {selected_button_id: buttonId, version: this.version + 1};
  }

  setButtonError(buttonId: string, errorMessage: string): void {
    this.errorButtonId(buttonId);
    this.errorMessage(errorMessage);
  }

  clearButtonError(): void {
    this.errorButtonId(undefined);
    this.errorMessage('');
  }
}
