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

import {QualifiedUserId} from '@wireapp/protocol-messaging';

import type {Translate} from 'Util/localizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {Message} from './message';

import {SuperType} from '../../../message/superType';
import {VerificationMessageType} from '../../../message/verificationmessagetype';
import type {User} from '../user';

export class VerificationMessage extends Message {
  public readonly userEntities: ko.ObservableArray<User>;
  public userIds: ko.ObservableArray<QualifiedUserId>;
  public VerificationMessageType: ko.Observable<VerificationMessageType | undefined>;
  public readonly isSelfClient: ko.PureComputed<boolean>;

  constructor(translate: Translate) {
    super(undefined, undefined, translate);

    this.super_type = SuperType.VERIFICATION;
    this.affect_order(false);

    this.VerificationMessageType = ko.observable();
    this.userIds = ko.observableArray<QualifiedUserId>();

    this.userEntities = ko.observableArray();

    this.isSelfClient = ko.pureComputed(() => {
      const messageUserId = this.userIds().length === 1 ? this.userIds()[0] : undefined;
      return messageUserId !== undefined && matchQualifiedIds(messageUserId, this.user().qualifiedId);
    });
  }
}
