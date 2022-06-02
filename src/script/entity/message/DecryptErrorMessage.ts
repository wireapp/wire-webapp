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

import {errors as ProteusErrors} from '@wireapp/proteus';
import ko from 'knockout';

import {t} from 'Util/LocalizerUtil';

import {URL_PATH, getWebsiteUrl} from '../../externalRoute';
import {SuperType} from '../../message/SuperType';
import {Message} from './Message';

export class DecryptErrorMessage extends Message {
  public client_id: string;
  public error_code: number;
  public domain?: string;
  private readonly is_remote_identity_changed: ko.PureComputed<boolean>;
  public readonly htmlCaption: ko.PureComputed<string>;
  public readonly is_recoverable: ko.PureComputed<boolean>;
  public readonly is_resetting_session: ko.Observable<boolean>;
  public readonly link: ko.PureComputed<string>;

  static get REMOTE_IDENTITY_CHANGED_ERROR() {
    return ProteusErrors.DecryptError.CODE.CASE_204.toString();
  }

  constructor() {
    super();
    this.super_type = SuperType.UNABLE_TO_DECRYPT;

    this.error_code = 0;
    this.client_id = '';

    // TODO: Replace this with React Intl interpolation once we can use it in the whole project
    // see https://formatjs.io/docs/react-intl/components/#rich-text-formatting
    this.htmlCaption = ko.pureComputed(() => {
      const userName = this.user().name();
      const replaceHighlight = {
        '/highlight': '</span>',
        highlight: '<span class="label-bold-xs">',
      };

      return this.is_remote_identity_changed()
        ? t('conversationUnableToDecrypt2', userName, replaceHighlight)
        : t('conversationUnableToDecrypt1', userName, replaceHighlight);
    });

    this.link = ko.pureComputed(() => {
      const path = this.is_remote_identity_changed() ? URL_PATH.DECRYPT_ERROR_2 : URL_PATH.DECRYPT_ERROR_1;
      return getWebsiteUrl(path);
    });

    this.is_recoverable = ko.pureComputed(() => {
      return this.error_code.toString().startsWith('2') && !this.is_remote_identity_changed();
    });
    this.is_remote_identity_changed = ko.pureComputed(() => {
      return this.error_code.toString() === DecryptErrorMessage.REMOTE_IDENTITY_CHANGED_ERROR;
    });
    this.is_resetting_session = ko.observable(false);
  }
}
