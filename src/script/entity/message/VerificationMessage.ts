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

import {SuperType} from '../../message/SuperType';
import {VerificationMessageType} from '../../message/VerificationMessageType';
import type {User} from '../User';
import {QualifiedUserId} from '@wireapp/protocol-messaging';
import {isQualifiedId} from 'Util/TypePredicateUtil';
import {Message} from './Message';

export class VerificationMessage extends Message {
  public readonly userEntities: ko.ObservableArray<User>;
  public userIds: ko.ObservableArray<QualifiedUserId | string>;
  public verificationMessageType: ko.Observable<VerificationMessageType>;
  public readonly isSelfClient: ko.PureComputed<boolean>;

  constructor() {
    super();

    this.super_type = SuperType.VERIFICATION;
    this.affect_order(false);

    this.verificationMessageType = ko.observable();
    this.userIds = ko.observableArray<QualifiedUserId | string>();

    this.userEntities = ko.observableArray();

    this.isSelfClient = ko.pureComputed(() => {
      const messageUserId = this.userIds()?.length === 1 && this.userIds()[0];
      return isQualifiedId(messageUserId)
        ? messageUserId.id === this.user().id && messageUserId.domain === this.user().domain
        : messageUserId === this.user().id;
    });
  }
}
