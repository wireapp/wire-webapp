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

import type {GenericMessage} from '@wireapp/protocol-messaging';
import type {UserClients} from '@wireapp/api-client/src/conversation/';

import type {User} from '../entity/User';
import {Core} from '../service/CoreSingleton';
import {container, singleton} from 'tsyringe';

@singleton()
export class BroadcastRepository {
  constructor(private readonly core: Core = container.resolve(Core)) {}

  /**
   * @param genericMessage Generic message that will be send
   * @param userEntities Recipients of the message
   * @returns resolves when the message is sent
   */
  public broadcastGenericMessage(genericMessage: GenericMessage, userEntities: User[]) {
    const recipients = userEntities.reduce<UserClients>((recipientsIndex, userEntity) => {
      recipientsIndex[userEntity.id] = userEntity.devices().map(clientEntity => clientEntity.id);
      return recipientsIndex;
    }, {});
    this.core.service!.broadcast.broadcastGenericMessage(genericMessage, recipients);
  }
}
