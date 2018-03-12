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
window.z.entity = z.entity || {};

z.entity.DecryptErrorMessage = class DecryptErrorMessage extends z.entity.Message {
  static get REMOTE_IDENTITY_CHANGED_ERROR() {
    return Proteus.errors.DecryptError.CODE.CASE_204.toString();
  }

  constructor() {
    super();
    this.super_type = z.message.SuperType.UNABLE_TO_DECRYPT;

    this.error_code = '';
    this.client_id = '';

    this.caption = ko.pureComputed(() => {
      const content = `<span class='label-bold-xs'>${z.util.escape_html(this.user().first_name())}</span>`;
      const string_id = this.is_remote_identity_changed()
        ? z.string.conversationUnableToDecrypt2
        : z.string.conversationUnableToDecrypt1;

      return z.l10n.text(string_id, content);
    });

    this.link = ko.pureComputed(() => {
      const path = this.is_remote_identity_changed()
        ? z.config.URL_PATH.DECRYPT_ERROR_2
        : z.config.URL_PATH.DECRYPT_ERROR_1;
      return z.util.URLUtil.build_url(z.util.URLUtil.TYPE.WEBSITE, path);
    });

    this.is_recoverable = ko.pureComputed(
      () => this.error_code.toString().startsWith('2') && !this.is_remote_identity_changed()
    );
    this.is_remote_identity_changed = ko.pureComputed(
      () => this.error_code.toString() === DecryptErrorMessage.REMOTE_IDENTITY_CHANGED_ERROR
    );
    this.is_resetting_session = ko.observable(false);

    this.error_message = ko.pureComputed(() => {
      const parts = [];

      if (this.error_code) {
        const error_text = z.l10n.text(z.string.conversationUnableToDecryptErrorMessage);
        parts.push(`${error_text}: <span class='label-bold-xs'>${this.error_code}</span>`);
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
