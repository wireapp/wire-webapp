/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {Environment} from 'Util/Environment';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../../Config';
import {UserRepository} from '../../user/UserRepository';

export class InviteModalViewModel {
  inviteMessage: ko.PureComputed<string>;
  inviteMessageSelected: ko.Observable<boolean>;
  inviteHint: ko.PureComputed<string>;
  brandName: string;
  isVisible: ko.Observable<boolean>;

  constructor(userRepository: UserRepository) {
    this.isVisible = ko.observable(false);
    this.brandName = Config.getConfig().BRAND_NAME;

    this.inviteMessage = ko.pureComputed(() => {
      if (userRepository.self()) {
        const username = userRepository.self().username();
        return username
          ? t('inviteMessage', {brandName: Config.getConfig().BRAND_NAME, username: `@${username}`})
          : t('inviteMessageNoEmail', Config.getConfig().BRAND_NAME);
      }
      return '';
    });

    this.inviteMessageSelected = ko.observable(false);
    this.inviteHint = ko.pureComputed(() => {
      const metaKey = Environment.os.mac ? t('inviteMetaKeyMac') : t('inviteMetaKeyPc');

      return this.inviteMessageSelected() ? t('inviteHintSelected', metaKey) : t('inviteHintUnselected', metaKey);
    });
  }
  hide = () => this.isVisible(false);

  show = () => this.isVisible(true);

  onTextClick = (textArea: HTMLTextAreaElement) => {
    textArea.select();
    this.inviteMessageSelected(true);
  };

  onBlur = () => this.inviteMessageSelected(false);
}
