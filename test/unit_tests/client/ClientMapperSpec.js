/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:client/ClientMapper

'use strict';

describe('z.client.ClientMapper', () => {
  const mapper = new z.client.ClientMapper();

  describe('map_client', () => {
    it('can map a permanent client payload from the backend', () => {
      const client_payload = entities.clients.john_doe.permanent;

      const client_et = mapper.map_client(client_payload);

      expect(client_et.address).toBe(client_payload.address);
      expect(client_et.class).toBe(client_payload.class);
      expect(client_et.cookie).toBe(client_payload.cookie);
      expect(client_et.id).toBe(client_payload.id);
      expect(client_et.label).toBe(client_payload.label);
      expect(client_et.location.lat).toBe(client_payload.location.lat);
      expect(client_et.location.lon).toBe(client_payload.location.lon);
      expect(client_et.meta.is_verified()).toBeFalsy();
      expect(client_et.model).toBe(client_payload.model);
      expect(client_et.time).toBe(client_payload.time);
      expect(client_et.type).toBe(z.client.ClientType.PERMANENT);
      expect(client_et.is_permanent()).toBeTruthy();
      expect(client_et.is_remote()).toBeFalsy();
      expect(client_et.is_temporary()).toBeFalsy();
    });

    it('can map a temporary client payload from the backend', () => {
      const client_payload = entities.clients.john_doe.temporary;

      const client_et = mapper.map_client(client_payload);

      expect(client_et.address).toBe(client_payload.address);
      expect(client_et.class).toBe(client_payload.class);
      expect(client_et.cookie).toBe(client_payload.cookie);
      expect(client_et.id).toBe(client_payload.id);
      expect(client_et.label).toBe(client_payload.label);
      expect(client_et.location.lat).toBe(client_payload.location.lat);
      expect(client_et.location.lon).toBe(client_payload.location.lon);
      expect(client_et.meta.is_verified()).toBeFalsy();
      expect(client_et.model).toBe(client_payload.model);
      expect(client_et.time).toBe(client_payload.time);
      expect(client_et.type).toBe(z.client.ClientType.TEMPORARY);
      expect(client_et.is_permanent()).toBeFalsy();
      expect(client_et.is_remote()).toBeFalsy();
      expect(client_et.is_temporary()).toBeTruthy();
    });

    it('can map a remote client payload from the backend', () => {
      const client_payload = entities.clients.jane_roe.plain;

      const client_et = mapper.map_client(client_payload);

      expect(client_et.id).toBe(client_payload.id);
      expect(client_et.class).toBe(client_payload.class);
      expect(client_et.meta.is_verified()).toBeFalsy();
      expect(client_et.is_permanent()).toBeFalsy();
      expect(client_et.is_remote()).toBeTruthy();
      expect(client_et.is_temporary()).toBeFalsy();
    });

    it('can map a remote client payload from our local database', () => {
      const client_payload = {
        class: 'desktop',
        id: '66d0515a23a0ef25',
        meta: {
          is_verified: true,
        },
      };

      const client_et = mapper.map_client(client_payload);

      expect(client_et.id).toBe(client_payload.id);
      expect(client_et.class).toBe(client_payload.class);
      expect(client_et.meta.is_verified()).toBeTruthy();
      expect(client_et.is_permanent()).toBeFalsy();
      expect(client_et.is_remote()).toBeTruthy();
      expect(client_et.is_temporary()).toBeFalsy();
    });

    it('can serialize a remote client payload to store it in our local database', () => {
      const client_payload = {
        class: 'desktop',
        id: '66d0515a23a0ef25',
        meta: {
          is_verified: true,
        },
      };

      const client_et = mapper.map_client(client_payload);
      const client_json = client_et.to_json();

      expect(client_json).toEqual(client_payload);
    });
  });

  describe('map_clients', () =>
    it('can map a multiple clients at once', () => {
      const client_ets = mapper.map_clients(payload.clients.get.many);

      expect(client_ets.length).toBe(2);
      expect(client_ets[0].id).toBe(entities.clients.john_doe.temporary.id);
      expect(client_ets[0].is_temporary()).toBeTruthy();
      expect(client_ets[1].id).toBe(entities.clients.john_doe.permanent.id);
      expect(client_ets[1].is_permanent()).toBeTruthy();
    }));

  describe('update_client', () => {
    it('can map changes into a client', () => {
      const initial_client_et = mapper.map_client(entities.clients.john_doe.plain);
      const client_payload = entities.clients.john_doe.permanent;

      const {client: client_et, was_updated} = mapper.update_client(initial_client_et, client_payload);

      expect(was_updated).toBeTruthy();
      expect(client_et.address).toBe(client_payload.address);
      expect(client_et.class).toBe(client_payload.class);
      expect(client_et.cookie).toBe(client_payload.cookie);
      expect(client_et.id).toBe(client_payload.id);
      expect(client_et.label).toBe(client_payload.label);
      expect(client_et.location.lat).toBe(client_payload.location.lat);
      expect(client_et.location.lon).toBe(client_payload.location.lon);
      expect(client_et.meta.is_verified()).toBeFalsy();
      expect(client_et.model).toBe(client_payload.model);
      expect(client_et.time).toBe(client_payload.time);
      expect(client_et.type).toBe(z.client.ClientType.PERMANENT);
      expect(client_et.is_permanent()).toBeTruthy();
      expect(client_et.is_remote()).toBeFalsy();
      expect(client_et.is_temporary()).toBeFalsy();
    });

    it('does not change the client if there are no updates', () => {
      const client_payload = entities.clients.john_doe.permanent;
      const initial_client_et = mapper.map_client(client_payload);

      const {client: client_et, was_updated} = mapper.update_client(initial_client_et, client_payload);

      expect(was_updated).toBeFalsy();
      expect(client_et.address).toBe(client_payload.address);
      expect(client_et.class).toBe(client_payload.class);
      expect(client_et.cookie).toBe(client_payload.cookie);
      expect(client_et.id).toBe(client_payload.id);
      expect(client_et.label).toBe(client_payload.label);
      expect(client_et.location.lat).toBe(client_payload.location.lat);
      expect(client_et.location.lon).toBe(client_payload.location.lon);
      expect(client_et.meta.is_verified()).toBeFalsy();
      expect(client_et.model).toBe(client_payload.model);
      expect(client_et.time).toBe(client_payload.time);
      expect(client_et.type).toBe(z.client.ClientType.PERMANENT);
      expect(client_et.is_permanent()).toBeTruthy();
      expect(client_et.is_remote()).toBeFalsy();
      expect(client_et.is_temporary()).toBeFalsy();
    });
  });
});
