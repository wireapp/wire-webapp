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

import {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {PermissionStatusState} from 'Repositories/permission/PermissionStatusState';
import {PermissionType} from 'Repositories/permission/PermissionType';

describe('PermissionRepository', () => {
  describe('constructor', () => {
    it('keep the default PROMPT value if permissionAPI is not available', done => {
      spyOn(navigator, 'permissions').and.returnValue(undefined);
      const permissionRepository = new PermissionRepository();
      setTimeout(() => {
        Object.values(permissionRepository.permissionState).forEach(state => {
          expect(state()).toBe(PermissionStatusState.PROMPT);
        });
        done();
      }, 0);
    });

    it("queries the browser's permission if permissionAPI is available", done => {
      const states = {
        [PermissionType.CAMERA]: {state: PermissionStatusState.GRANTED},
        [PermissionType.GEO_LOCATION]: {state: PermissionStatusState.PROMPT},
        [PermissionType.MICROPHONE]: {state: PermissionStatusState.DENIED},
        [PermissionType.NOTIFICATIONS]: {state: PermissionStatusState.GRANTED},
      };

      spyOn(navigator.permissions, 'query').and.callFake(type => {
        return Promise.resolve(states[type.name]);
      });

      const permissionRepository = new PermissionRepository();
      setTimeout(() => {
        Object.entries(permissionRepository.permissionState).forEach(([type, state]) => {
          expect(state()).toBe(states[type].state);
        });
        done();
      }, 0);
    });

    it('keeps the default values if one permission type is not supported by the browser', done => {
      const states = {
        [PermissionType.CAMERA]: {state: PermissionStatusState.GRANTED},
        [PermissionType.GEO_LOCATION]: {state: PermissionStatusState.GRANTED},
        [PermissionType.MICROPHONE]: {state: PermissionStatusState.GRANTED},
      };

      spyOn(navigator.permissions, 'query').and.callFake(type => {
        if (!states[type.name]) {
          return Promise.reject(new Error(`permission type ${type} not supported`));
        }
        return Promise.resolve(states[type.name]);
      });

      const permissionRepository = new PermissionRepository();
      setTimeout(() => {
        permissionRepository.getPermissionStates(Object.keys(states)).forEach(({state, type}) => {
          expect(state).toBe(states[type].state);
        });
        const notificationPermissionState = permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS);

        expect(notificationPermissionState).toBe(PermissionStatusState.PROMPT);
        done();
      }, 0);
    });
  });
});
