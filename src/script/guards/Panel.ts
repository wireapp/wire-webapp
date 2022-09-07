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

import {User} from '../entity/User';
import {PanelParams} from '../view_model/PanelViewModel';
import {ServiceEntity} from '../integration/ServiceEntity';

export const isServiceEntity = (entity: PanelParams['entity']): entity is ServiceEntity => {
  return 'isService' in entity && entity.isService;
};

export const isUserEntity = (entity: PanelParams['entity']): entity is User => {
  return !isServiceEntity(entity);
};

export const isUserServiceEntity = (entity: PanelParams['entity']): entity is User => {
  return isServiceEntity(entity);
};
