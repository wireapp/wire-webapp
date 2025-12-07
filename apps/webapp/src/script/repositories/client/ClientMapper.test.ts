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

import {ClientType, ClientClassification} from '@wireapp/api-client/lib/client/';
import {ClientRecord} from 'Repositories/storage';
import {entities, payload} from 'test/api/payloads';

import {ClientMapper} from './ClientMapper';

describe('ClientMapper', () => {
  describe('mapClient', () => {
    it('can map a permanent client payload from the backend', () => {
      const clientPayload = entities.clients.john_doe.permanent;

      const clientEntity = ClientMapper.mapClient(clientPayload, true);

      expect(clientEntity.address).toBe(clientPayload.address);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.cookie).toBe(clientPayload.cookie);
      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.label).toBe(clientPayload.label);
      expect(clientEntity.meta.isVerified?.()).toBe(false);
      expect(clientEntity.model).toBe(clientPayload.model);
      expect(clientEntity.time).toBe(clientPayload.time);
      expect(clientEntity.type).toBe(ClientType.PERMANENT);
      expect(clientEntity.isPermanent()).toBe(true);
      expect(clientEntity.isTemporary()).toBe(false);
    });

    it('can map a temporary client payload from the backend', () => {
      const clientPayload = entities.clients.john_doe.temporary;

      const clientEntity = ClientMapper.mapClient(clientPayload, true);

      expect(clientEntity.address).toBe(clientPayload.address);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.cookie).toBe(clientPayload.cookie);
      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.label).toBe(clientPayload.label);
      expect(clientEntity.meta.isVerified?.()).toBe(false);
      expect(clientEntity.model).toBe(clientPayload.model);
      expect(clientEntity.time).toBe(clientPayload.time);
      expect(clientEntity.type).toBe(ClientType.TEMPORARY);
      expect(clientEntity.isPermanent()).toBe(false);
      expect(clientEntity.isTemporary()).toBe(true);
    });

    it('can map a remote client payload from the backend', () => {
      const clientPayload = entities.clients.jane_roe.plain;

      const clientEntity = ClientMapper.mapClient(clientPayload, false);

      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.meta.isVerified?.()).toBe(false);
      expect(clientEntity.isPermanent()).toBe(false);
      expect(clientEntity.isTemporary()).toBe(false);
    });

    it('can map a remote client payload from our local database', () => {
      const clientPayload: ClientRecord = {
        class: ClientClassification.DESKTOP,
        id: '66d0515a23a0ef25',
        meta: {
          is_verified: true,
        },
      };

      const clientEntity = ClientMapper.mapClient(clientPayload, false);

      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.meta.isVerified?.()).toBe(true);
      expect(clientEntity.isPermanent()).toBe(false);
      expect(clientEntity.isTemporary()).toBe(false);
    });

    it('can serialize a remote client payload to store it in our local database', () => {
      const clientPayload: ClientRecord = {
        class: ClientClassification.DESKTOP,
        id: '66d0515a23a0ef25',
        domain: '',
        meta: {
          is_verified: true,
        },
      };

      const clientEntity = ClientMapper.mapClient(clientPayload, false);
      const clientJson = clientEntity.toJson();

      expect(clientJson).toEqual(clientPayload);
    });
  });

  describe('mapClients', () => {
    it('can map a multiple clients at once', () => {
      const clientEntities = ClientMapper.mapClients(payload.clients.get.many, true);
      const [firstClientEntity, secondClientEntity] = clientEntities;

      expect(clientEntities.length).toBe(2);
      expect(firstClientEntity.id).toBe(entities.clients.john_doe.temporary.id);
      expect(firstClientEntity.isTemporary()).toBe(true);
      expect(secondClientEntity.id).toBe(entities.clients.john_doe.permanent.id);
      expect(secondClientEntity.isPermanent()).toBe(true);
    });
  });

  describe('updateClient', () => {
    it('can map changes into a client', () => {
      const initialClientEntity = ClientMapper.mapClient(entities.clients.john_doe.plain, true);
      const clientPayload = entities.clients.john_doe.permanent;

      const {client: clientEntity, wasUpdated} = ClientMapper.updateClient(initialClientEntity, clientPayload);

      expect(wasUpdated).toBe(true);
      expect(clientEntity.address).toBe(clientPayload.address);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.cookie).toBe(clientPayload.cookie);
      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.label).toBe(clientPayload.label);
      expect(clientEntity.meta.isVerified?.()).toBe(false);
      expect(clientEntity.model).toBe(clientPayload.model);
      expect(clientEntity.time).toBe(clientPayload.time);
      expect(clientEntity.type).toBe(ClientType.PERMANENT);
      expect(clientEntity.isPermanent()).toBe(true);
      expect(clientEntity.isTemporary()).toBe(false);
    });

    it('does not change the client if there are no updates', () => {
      const clientPayload = entities.clients.john_doe.permanent;
      const initialClientEntity = ClientMapper.mapClient(clientPayload, true);

      const {client: clientEntity, wasUpdated} = ClientMapper.updateClient(initialClientEntity, clientPayload);

      expect(wasUpdated).toBe(false);
      expect(clientEntity.address).toBe(clientPayload.address);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.cookie).toBe(clientPayload.cookie);
      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.label).toBe(clientPayload.label);
      expect(clientEntity.meta.isVerified?.()).toBe(false);
      expect(clientEntity.model).toBe(clientPayload.model);
      expect(clientEntity.time).toBe(clientPayload.time);
      expect(clientEntity.type).toBe(ClientType.PERMANENT);
      expect(clientEntity.isPermanent()).toBe(true);
      expect(clientEntity.isTemporary()).toBe(false);
    });
  });
});
