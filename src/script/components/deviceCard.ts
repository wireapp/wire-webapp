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

import ko from 'knockout';
import {ClientClassification} from '@wireapp/api-client/src/client';

import type {ClientEntity} from '../client/ClientEntity';

interface DeviceCardParams {
  click?: (device: ClientEntity) => void;
  current?: boolean;
  detailed?: boolean;
  device: ClientEntity | ko.Observable<ClientEntity>;
  showIcon?: boolean;
  showVerified?: boolean;
}

ko.components.register('device-card', {
  template: `
    <div class="device-card" data-uie-name="device-card" data-bind="click: clickOnDevice, attr: {'data-uie-uid': id, 'data-uie-name': dataUieName}, css: {'device-card__no-hover': !clickable}"">
      <!-- ko if: showLegalHoldIcon -->
        <legal-hold-dot class="device-card__icon" data-uie-name="status-legal-hold-device"></legal-hold-dot>
      <!-- /ko -->
      <!-- ko if: showDesktopIcon -->
        <desktop-icon class="device-card__icon" data-uie-name="status-desktop-device"></desktop-icon>
      <!-- /ko -->
      <!-- ko if: showOtherIcon -->
        <devices-icon class="device-card__icon" data-uie-name="status-mobile-device"></devices-icon>
      <!-- /ko -->
      <div class="device-card__info" data-uie-name="device-card-info" data-bind="attr: {'data-uie-value': label}">
        <!-- ko if: detailed -->
          <div class="label-xs device-card__label" data-bind="text: label"></div>
          <div class="label-xs">
            <span data-bind="text: t('preferencesDevicesId')"></span>
            <span data-bind="foreach: formattedId" data-uie-name="device-id"><span class="device-id-part" data-bind="text: $data"></span></span>
          </div>
          <div class="label-xs" data-bind="text: timeStamp"></div>
        <!-- /ko -->
        <!-- ko ifnot: detailed -->
          <div class="label-xs">
            <span class="device-card__model" data-bind="text: name"></span>
            <span class="text-background" data-bind="visible: isCurrentClient, text: t('authLimitDevicesCurrent')"></span>
          </div>
          <div class="text-background label-xs">
            <span data-bind="text: t('preferencesDevicesId')"></span>
            <span data-bind="foreach: formattedId" data-uie-name="device-id"><span class="device-id-part" data-bind="text: $data"></span></span>
          </div>
        <!-- /ko -->
      </div>
      <!-- ko if: showVerified -->
        <!-- ko if: isVerified()-->
          <verified-icon data-uie-name="user-device-verified"></verified-icon>
        <!-- /ko -->
        <!-- ko ifnot: isVerified()-->
          <not-verified-icon data-uie-name="user-device-not-verified"></not-verified-icon>
        <!-- /ko -->
      <!-- /ko -->
      <!-- ko if: clickable -->
        <disclose-icon></disclose-icon>
      <!-- /ko -->
    </div>
  `,
  viewModel: function ({
    click,
    device: wrappedDevice,
    detailed = false,
    current = false,
    showVerified = false,
    showIcon = false,
  }: DeviceCardParams): void {
    const clientEntity = ko.unwrap(wrappedDevice);
    const {class: deviceClass = '?', id = '', label = '?', meta} = clientEntity;
    this.formattedId = id ? clientEntity.formatId() : [];
    this.id = id;
    this.label = label;
    this.name = clientEntity.getName();

    this.isCurrentClient = current;
    this.detailed = detailed;
    this.clickable = !detailed && click;

    this.dataUieName = `device-card${current ? '-current' : ''}`;
    this.isVerified = meta.isVerified;
    this.showVerified = showVerified;
    this.showLegalHoldIcon = showIcon && deviceClass === ClientClassification.LEGAL_HOLD;
    this.showDesktopIcon = showIcon && deviceClass === ClientClassification.DESKTOP;
    this.showOtherIcon = showIcon && !this.showLegalHoldIcon && !this.showDesktopIcon;

    this.clickOnDevice = () => {
      if (typeof click === 'function') {
        click(clientEntity);
      }
    };
  },
});
