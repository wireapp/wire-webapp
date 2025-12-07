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

import {useRef} from 'react';

import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import cx from 'classnames';
import {t} from 'Util/LocalizerUtil';

import * as Icon from '../Icon';

interface ReceiptModeToggleProps {
  onReceiptModeChanged: (receiptMode: RECEIPT_MODE) => void;
  receiptMode: RECEIPT_MODE;
  disabled?: boolean;
}

const ReceiptModeToggle = ({receiptMode, onReceiptModeChanged, disabled = false}: ReceiptModeToggleProps) => {
  const updateValue = () => {
    if (!disabled) {
      const newReceiptMode = receiptMode !== RECEIPT_MODE.ON ? RECEIPT_MODE.ON : RECEIPT_MODE.OFF;
      onReceiptModeChanged(newReceiptMode);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const isChecked = receiptMode !== RECEIPT_MODE.OFF;

  return (
    <>
      <div
        className={cx('panel__action-item', 'panel__action-item--toggle', {
          'panel__action-item--disabled': disabled,
        })}
      >
        <label
          htmlFor="receipt-toggle-input"
          data-uie-name="do-toggle-receipt-mode"
          data-uie-receipt-status={receiptMode}
          className="panel__action-item-label"
        >
          <span className="panel__action-item__icon">
            <Icon.ReadIcon />
          </span>

          <span className="panel__action-item__summary">
            <span className="panel__action-item__text">{t('receiptToggleLabel')}</span>
          </span>
        </label>

        <input
          ref={inputRef}
          checked={isChecked}
          className="slider-input"
          data-uie-name="toggle-receipt-mode-checkbox"
          id="receipt-toggle-input"
          name="preferences_device_verification_toggle"
          onChange={() => updateValue()}
          type="checkbox"
          disabled={disabled}
        />

        <button
          className={`button-label${disabled ? ' disabled' : ''}`}
          aria-pressed={receiptMode !== RECEIPT_MODE.OFF}
          type="button"
          onClick={() => updateValue()}
          disabled={disabled}
        >
          <span className="button-label__switch" />
          <span className="visually-hidden">{t('receiptToggleLabel')}</span>
        </button>
      </div>

      <p
        className="panel__info-text panel__info-text--margin panel__action-item__status"
        data-uie-name="status-info-toggle-receipt-mode"
      >
        {t('receiptToggleInfo')}
      </p>
    </>
  );
};

export {ReceiptModeToggle};
