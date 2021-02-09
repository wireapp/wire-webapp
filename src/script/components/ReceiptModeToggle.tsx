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

import React, {Fragment} from 'react';
import {Confirmation} from '@wireapp/protocol-messaging';

import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import type {Conversation} from '../entity/Conversation';
import NamedIcon from './NamedIcon';

export interface ReceiptModeToggleProps {
  conversation: Conversation;
  onReceiptModeChanged: (conversation: Conversation, receiptMode: Confirmation.Type) => void;
}

const ReceiptModeToggle: React.FC<ReceiptModeToggleProps> = ({conversation, onReceiptModeChanged}) => {
  const updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const receiptMode = event.target.checked ? Confirmation.Type.READ : Confirmation.Type.DELIVERED;
    conversation.receiptMode(receiptMode);
    onReceiptModeChanged(conversation, receiptMode);
  };

  return (
    <Fragment>
      <div className="panel__action-item">
        <NamedIcon name="read-icon" className="panel__action-item__icon" />
        <div className="panel__action-item__summary">
          <div className="panel__action-item__text">{t('receiptToggleLabel')}</div>
        </div>
        <input
          checked={conversation.receiptMode() !== Confirmation.Type.DELIVERED}
          className="slider-input"
          id="receipt-toggle-input"
          name="preferences_device_verification_toggle"
          onChange={updateValue}
          type="checkbox"
          data-uie-name="toggle-receipt-mode-checkbox"
        />
        <label
          htmlFor="receipt-toggle-input"
          data-uie-name="do-toggle-receipt-mode"
          data-uie-receipt-status={conversation.receiptMode()}
        />
      </div>
      <div className="panel__info-text panel__info-text--margin" data-uie-name="status-info-toggle-receipt-mode">
        {t('receiptToggleInfo')}
      </div>
    </Fragment>
  );
};

export default ReceiptModeToggle;

registerReactComponent('read-receipt-toggle', {
  component: ReceiptModeToggle,
  template: '<span data-bind="react: {conversation: ko.unwrap(conversation), onReceiptModeChanged}"></span>',
});
