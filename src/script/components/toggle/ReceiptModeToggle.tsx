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
import {RECEIPT_MODE} from '@wireapp/api-client/src/conversation/data';

import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import Icon from '../Icon';

export interface ReceiptModeToggleProps {
  onReceiptModeChanged: (receiptMode: RECEIPT_MODE) => void;
  receiptMode: RECEIPT_MODE;
}

const ReceiptModeToggle: React.FC<ReceiptModeToggleProps> = ({receiptMode, onReceiptModeChanged}) => {
  const updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newReceiptMode = event.target.checked ? RECEIPT_MODE.ON : RECEIPT_MODE.OFF;
    onReceiptModeChanged(newReceiptMode);
  };

  return (
    <Fragment>
      <div className="panel__action-item">
        <div className="panel__action-item__icon">
          <Icon.Read />
        </div>
        <div className="panel__action-item__summary">
          <div className="panel__action-item__text">{t('receiptToggleLabel')}</div>
        </div>
        <input
          checked={receiptMode !== RECEIPT_MODE.OFF}
          className="slider-input"
          data-uie-name="toggle-receipt-mode-checkbox"
          id="receipt-toggle-input"
          name="preferences_device_verification_toggle"
          onChange={updateValue}
          type="checkbox"
        />
        <label
          htmlFor="receipt-toggle-input"
          data-uie-name="do-toggle-receipt-mode"
          data-uie-receipt-status={receiptMode}
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
  template: '<div data-bind="react: {receiptMode: ko.unwrap(receiptMode), onReceiptModeChanged}"></span>',
});
