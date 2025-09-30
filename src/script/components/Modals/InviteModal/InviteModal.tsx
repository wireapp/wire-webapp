/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React, {useState} from 'react';

import {Runtime} from '@wireapp/commons';

import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {User} from 'Repositories/entity/User';
import {t} from 'Util/LocalizerUtil';
import {renderElement} from 'Util/renderElement';

import {Config} from '../../../Config';

interface InviteModalProps {
  readonly selfUser: User;
  onClose?: () => void;
}

const {BRAND_NAME: brandName} = Config.getConfig();

const InviteModal: React.FC<InviteModalProps> = ({selfUser, onClose}) => {
  const [isInviteMessageSelected, setIsInviteMessageSelected] = useState<boolean>(false);
  const userName = selfUser.username();
  const inviteMessage = userName
    ? t('inviteMessage', {brandName: brandName, username: `@${userName}`})
    : t('inviteMessageNoEmail', {brandName});

  const metaKey = Runtime.isMacOS() ? t('inviteMetaKeyMac') : t('inviteMetaKeyPc');
  const inviteHint = isInviteMessageSelected
    ? t('inviteHintSelected', {metaKey})
    : t('inviteHintUnselected', {metaKey});

  const onTextClick = () => setIsInviteMessageSelected(true);
  const onBlur = () => setIsInviteMessageSelected(false);

  const onClick = (ev: React.MouseEvent<HTMLTextAreaElement, MouseEvent>) => {
    (ev.target as HTMLTextAreaElement).select();
    onTextClick();
  };

  const onFocus = (ev: React.FocusEvent<HTMLTextAreaElement, Element>) => {
    ev.target.select();
    onTextClick();
  };

  return (
    <ModalComponent
      isShown
      onBgClick={onClose}
      onClosed={onClose}
      data-uie-name="modal-invite"
      className="invite-modal"
    >
      <div className="modal__header">
        <h2 className="modal__header__title" data-uie-name="status-modal-title">
          {t('inviteHeadline', {brandName})}
        </h2>

        <button type="button" className="modal__header__button" onClick={onClose} data-uie-name="do-close">
          <Icon.CloseIcon />
        </button>
      </div>

      <div className="modal__body invite-modal__body">
        <textarea
          defaultValue={inviteMessage}
          onClick={onClick}
          onFocus={onFocus}
          onBlur={onBlur}
          className="modal__input reset-textarea invite-modal__message"
          dir="auto"
          data-uie-name="invite-modal-message"
        />

        <div className="modal__info invite-modal__info">{inviteHint}</div>
      </div>
    </ModalComponent>
  );
};

const showInviteModal = renderElement<InviteModalProps>(InviteModal);

export {InviteModal, showInviteModal};
