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

window.z = window.z || {};
window.z.entity = z.entity || {};

z.entity.VerificationMessage = class VerificationMessage extends z.entity.Message {
  constructor() {
    super();

    this.super_type = z.message.SuperType.VERIFICATION;
    this.affect_order(false);
    this.verificationMessageType = ko.observable();

    this.userEntities = ko.observableArray();
    this.userIds = ko.observableArray();

    this.isSelfClient = ko.pureComputed(() => {
      return this.userIds().length === 1 && this.userIds()[0] === this.user().id;
    });

    this.isTypeNewDevice = ko.pureComputed(() => {
      return this.verificationMessageType() === z.message.VerificationMessageType.NEW_DEVICE;
    });
    this.isTypeNewMember = ko.pureComputed(() => {
      return this.verificationMessageType() === z.message.VerificationMessageType.NEW_MEMBER;
    });
    this.isTypeUnverified = ko.pureComputed(() => {
      return this.verificationMessageType() === z.message.VerificationMessageType.UNVERIFIED;
    });
    this.isTypeVerified = ko.pureComputed(() => {
      return this.verificationMessageType() === z.message.VerificationMessageType.VERIFIED;
    });

    this.captionUser = ko.pureComputed(() => {
      const namesString = z.util.LocalizerUtil.joinNames(this.userEntities(), z.string.Declension.NOMINATIVE);
      return z.util.StringUtil.capitalizeFirstChar(namesString);
    });

    this.captionStartedUsing = ko.pureComputed(() => {
      const hasMultipleUsers = this.userIds().length > 1;
      const stringId = hasMultipleUsers
        ? z.string.conversationDeviceStartedUsingMany
        : z.string.conversationDeviceStartedUsingOne;

      return z.l10n.text(stringId);
    });

    this.captionNewDevice = ko.pureComputed(() => {
      const hasMultipleUsers = this.userIds().length > 1;
      const stringId = hasMultipleUsers
        ? z.string.conversationDeviceNewDeviceMany
        : z.string.conversationDeviceNewDeviceOne;

      return z.l10n.text(stringId);
    });

    this.captionUnverifiedDevice = ko.pureComputed(() => {
      const [firstUserEntity] = this.userEntities();
      const stringId = this.isSelfClient()
        ? z.string.conversationDeviceYourDevices
        : z.string.conversationDeviceUserDevices;

      return z.l10n.text(stringId, firstUserEntity.first_name());
    });
  }

  clickOnDevice() {
    const topic = this.isSelfClient() ? z.event.WebApp.PREFERENCES.MANAGE_DEVICES : z.event.WebApp.SHORTCUT.PEOPLE;
    amplify.publish(topic);
  }
};
