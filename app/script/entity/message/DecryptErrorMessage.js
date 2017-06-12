/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.entity = z.entity || {};

z.entity.DecryptErrorMessage = class DecryptErrorMessage extends z.entity
  .Message {
  constructor() {
    super();
    this.super_type = z.message.SuperType.UNABLE_TO_DECRYPT;

    this.error_code = '';
    this.client_id = '';

    this.caption = ko.pureComputed(() => {
      const content = `<span class='label-bold-xs'>${z.util.escape_html(
        this.user().first_name()
      )}</span>`;
      const string_id = this.error_code ===
        Proteus.errors.DecodeError.CODE.CASE_204
        ? z.string.conversation_unable_to_decrypt_2
        : z.string.conversation_unable_to_decrypt_1;

      return z.l10n.text(string_id, content);
    });

    this.link = ko.pureComputed(() => {
      const string_id = this.error_code ===
        Proteus.errors.DecodeError.CODE.CASE_204
        ? z.string.url_decrypt_error_2
        : z.string.url_decrypt_error_1;
      return z.l10n.text(string_id);
    });

    this.is_recoverable = ko.pureComputed(() => {
      return this.error_code.toString().startsWith('2');
    });

    this.is_resetting_session = ko.observable(false);

    this.error_message = ko.pureComputed(() => {
      const parts = [];

      if (this.error_code) {
        const error_text = z.l10n.text(
          z.string.conversation_unable_to_decrypt_error_message
        );
        parts.push(
          `${error_text}: <span class='label-bold-xs'>${this.error_code}</span>`
        );
      }

      if (this.client_id) {
        parts.push(`ID: ${z.util.print_devices_id(this.client_id)}`);
      }

      if (parts.length) {
        return `(${parts.join(' ')})`;
      }
    });
  }
};
