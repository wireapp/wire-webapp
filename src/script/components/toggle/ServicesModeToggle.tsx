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

import React, {Fragment} from 'react';
import {RECEIPT_MODE} from '@wireapp/api-client/src/conversation/data';

import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import Icon from '../Icon';

export interface ServicesModeToggleProps {
  onServicesModeChanged: (receiptMode: RECEIPT_MODE) => void;
  receiptMode: RECEIPT_MODE;
}

const ServicesModeToggle: React.FC<ServicesModeToggleProps> = ({receiptMode, onServicesModeChanged}) => {
  const updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newServicesMode = event.target.checked ? RECEIPT_MODE.ON : RECEIPT_MODE.OFF;
    onServicesModeChanged(newServicesMode);
  };

  return (
    <Fragment>
      <div className="panel__action-item">
        <div className="panel__action-item__icon">
          <Icon.Read />
        </div>
        <div className="panel__action-item__summary">
          <div className="panel__action-item__text">{t('servicesToggleLabel')}</div>
        </div>
        <input
          checked={receiptMode !== RECEIPT_MODE.OFF}
          className="slider-input"
          data-uie-name="toggle-services-mode-checkbox"
          id="services-toggle-input"
          name="preferences_device_verification_toggle"
          onChange={updateValue}
          type="checkbox"
        />
        <label
          htmlFor="services-toggle-input"
          data-uie-name="do-toggle-receipt-mode"
          data-uie-receipt-status={receiptMode}
        />
      </div>
      <div className="panel__info-text panel__info-text--margin" data-uie-name="status-info-toggle-services-mode">
        {t('servicesRoomToggleInfoExtended')}
      </div>
    </Fragment>
  );
};

export default ServicesModeToggle;

registerReactComponent('read-services-toggle', {
  component: ServicesModeToggle,
  template: '<div data-bind="react: {receiptMode: ko.unwrap(receiptMode), onReceiptModeChanged}"></span>',
});
