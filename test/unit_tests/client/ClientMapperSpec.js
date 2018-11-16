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

// grunt test_run:client/ClientMapper

'use strict';

describe('z.client.ClientMapper', () => {
  const mapper = new z.client.ClientMapper();

  describe('mapClient', () => {
    it('can map a permanent client payload from the backend', () => {
      const clientPayload = entities.clients.john_doe.permanent;

      const clientEntity = mapper.mapClient(clientPayload, true);

      expect(clientEntity.address).toBe(clientPayload.address);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.cookie).toBe(clientPayload.cookie);
      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.label).toBe(clientPayload.label);
      expect(clientEntity.location.lat).toBe(clientPayload.location.lat);
      expect(clientEntity.location.lon).toBe(clientPayload.location.lon);
      expect(clientEntity.meta.isVerified()).toBeFalsy();
      expect(clientEntity.model).toBe(clientPayload.model);
      expect(clientEntity.time).toBe(clientPayload.time);
      expect(clientEntity.type).toBe(z.client.ClientType.PERMANENT);
      expect(clientEntity.isPermanent()).toBeTruthy();
      expect(clientEntity.isRemote()).toBeFalsy();
      expect(clientEntity.isTemporary()).toBeFalsy();
    });

    it('can map a temporary client payload from the backend', () => {
      const clientPayload = entities.clients.john_doe.temporary;

      const clientEntity = mapper.mapClient(clientPayload, true);

      expect(clientEntity.address).toBe(clientPayload.address);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.cookie).toBe(clientPayload.cookie);
      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.label).toBe(clientPayload.label);
      expect(clientEntity.location.lat).toBe(clientPayload.location.lat);
      expect(clientEntity.location.lon).toBe(clientPayload.location.lon);
      expect(clientEntity.meta.isVerified()).toBeFalsy();
      expect(clientEntity.model).toBe(clientPayload.model);
      expect(clientEntity.time).toBe(clientPayload.time);
      expect(clientEntity.type).toBe(z.client.ClientType.TEMPORARY);
      expect(clientEntity.isPermanent()).toBeFalsy();
      expect(clientEntity.isRemote()).toBeFalsy();
      expect(clientEntity.isTemporary()).toBeTruthy();
    });

    it('can map a remote client payload from the backend', () => {
      const clientPayload = entities.clients.jane_roe.plain;

      const clientEntity = mapper.mapClient(clientPayload, false);

      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.meta.isVerified()).toBeFalsy();
      expect(clientEntity.isPermanent()).toBeFalsy();
      expect(clientEntity.isRemote()).toBeTruthy();
      expect(clientEntity.isTemporary()).toBeFalsy();
    });

    it('can map a remote client payload from our local database', () => {
      const clientPayload = {
        class: 'desktop',
        id: '66d0515a23a0ef25',
        meta: {
          is_verified: true,
        },
      };

      const clientEntity = mapper.mapClient(clientPayload, false);

      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.meta.isVerified()).toBeTruthy();
      expect(clientEntity.isPermanent()).toBeFalsy();
      expect(clientEntity.isRemote()).toBeTruthy();
      expect(clientEntity.isTemporary()).toBeFalsy();
    });

    it('can serialize a remote client payload to store it in our local database', () => {
      const clientPayload = {
        class: 'desktop',
        id: '66d0515a23a0ef25',
        meta: {
          is_verified: true,
        },
      };

      const clientEntity = mapper.mapClient(clientPayload, false);
      const clientJson = clientEntity.toJson();

      expect(clientJson).toEqual(clientPayload);
    });
  });

  describe('mapClients', () =>
    it('can map a multiple clients at once', () => {
      const clientEntities = mapper.mapClients(payload.clients.get.many, true);
      const [firstClientEntity, secondClientEntity] = clientEntities;

      expect(clientEntities.length).toBe(2);
      expect(firstClientEntity.id).toBe(entities.clients.john_doe.temporary.id);
      expect(firstClientEntity.isTemporary()).toBeTruthy();
      expect(secondClientEntity.id).toBe(entities.clients.john_doe.permanent.id);
      expect(secondClientEntity.isPermanent()).toBeTruthy();
    }));

  describe('updateClient', () => {
    it('can map changes into a client', () => {
      const initialClientEntity = mapper.mapClient(entities.clients.john_doe.plain, true);
      const clientPayload = entities.clients.john_doe.permanent;

      const {client: clientEntity, wasUpdated} = mapper.updateClient(initialClientEntity, clientPayload);

      expect(wasUpdated).toBeTruthy();
      expect(clientEntity.address).toBe(clientPayload.address);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.cookie).toBe(clientPayload.cookie);
      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.label).toBe(clientPayload.label);
      expect(clientEntity.location.lat).toBe(clientPayload.location.lat);
      expect(clientEntity.location.lon).toBe(clientPayload.location.lon);
      expect(clientEntity.meta.isVerified()).toBeFalsy();
      expect(clientEntity.model).toBe(clientPayload.model);
      expect(clientEntity.time).toBe(clientPayload.time);
      expect(clientEntity.type).toBe(z.client.ClientType.PERMANENT);
      expect(clientEntity.isPermanent()).toBeTruthy();
      expect(clientEntity.isRemote()).toBeFalsy();
      expect(clientEntity.isTemporary()).toBeFalsy();
    });

    it('does not change the client if there are no updates', () => {
      const clientPayload = entities.clients.john_doe.permanent;
      const initialClientEntity = mapper.mapClient(clientPayload, true);

      const {client: clientEntity, wasUpdated} = mapper.updateClient(initialClientEntity, clientPayload);

      expect(wasUpdated).toBeFalsy();
      expect(clientEntity.address).toBe(clientPayload.address);
      expect(clientEntity.class).toBe(clientPayload.class);
      expect(clientEntity.cookie).toBe(clientPayload.cookie);
      expect(clientEntity.id).toBe(clientPayload.id);
      expect(clientEntity.label).toBe(clientPayload.label);
      expect(clientEntity.location.lat).toBe(clientPayload.location.lat);
      expect(clientEntity.location.lon).toBe(clientPayload.location.lon);
      expect(clientEntity.meta.isVerified()).toBeFalsy();
      expect(clientEntity.model).toBe(clientPayload.model);
      expect(clientEntity.time).toBe(clientPayload.time);
      expect(clientEntity.type).toBe(z.client.ClientType.PERMANENT);
      expect(clientEntity.isPermanent()).toBeTruthy();
      expect(clientEntity.isRemote()).toBeFalsy();
      expect(clientEntity.isTemporary()).toBeFalsy();
    });
  });
});
