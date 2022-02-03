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

import {SingleInstanceHandler} from 'src/script/main/SingleInstanceHandler';
import Cookies from 'js-cookie';

describe('SingleInstanceHandler', () => {
  describe('registerInstance', () => {
    it('registers the current instance', () => {
      const singleInstanceHandler = new SingleInstanceHandler();
      const instanceId = 'instance-id-12';
      spyOn(Cookies, 'get').and.returnValue(undefined);
      spyOn(Cookies, 'set').and.returnValue(undefined);
      const result = singleInstanceHandler.registerInstance(instanceId);

      expect(Cookies.set).toHaveBeenCalledWith(
        'app_opened',
        {appInstanceId: instanceId},
        {
          sameSite: 'Lax',
        },
      );
      expect(result).toBe(true);
    });

    it('starts check interval when a callback was given', () => {
      const singleInstanceHandler = new SingleInstanceHandler(() => {});
      const instanceId = 'instance-id-12';
      spyOn(window, 'setInterval').and.returnValue(12);
      spyOn(Cookies, 'get').and.returnValue(undefined);
      spyOn(Cookies, 'set').and.returnValue(undefined);

      singleInstanceHandler.registerInstance(instanceId);

      expect(window.setInterval).toHaveBeenCalled();
    });

    it("doesn't register the current instance if instance already running", () => {
      const singleInstanceHandler = new SingleInstanceHandler();
      spyOn(Cookies, 'get').and.returnValue({status: 'true'});
      spyOn(Cookies, 'set').and.returnValue(undefined);
      const result = singleInstanceHandler.registerInstance('instance-id');

      expect(Cookies.set).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('deregisterInstance', () => {
    it('deregister current instance and stops interval if the instance id matches the registered instance', () => {
      const singleInstanceHandler = new SingleInstanceHandler(() => {});
      const instanceId = 'instance-id-12';
      spyOn(Cookies, 'getJSON').and.returnValue({appInstanceId: instanceId});
      spyOn(Cookies, 'remove').and.returnValue(undefined);
      spyOn(window, 'clearInterval').and.returnValue(undefined);
      spyOn(window, 'setInterval').and.returnValue(12);

      singleInstanceHandler.registerInstance(instanceId);
      singleInstanceHandler.deregisterInstance();

      expect(Cookies.remove).toHaveBeenCalledWith('app_opened');
      expect(window.clearInterval).toHaveBeenCalledWith(12);
    });

    it('does not deregister current instance if instance ids do not match', () => {
      const singleInstanceHandler = new SingleInstanceHandler();
      const instanceId = 'instance-id-12';
      spyOn(Cookies, 'getJSON').and.returnValue({appInstanceId: 'other-instance-id'});
      spyOn(Cookies, 'remove').and.returnValue(undefined);
      singleInstanceHandler.instanceId = instanceId;

      singleInstanceHandler.deregisterInstance();

      expect(Cookies.remove).not.toHaveBeenCalled();
    });

    it('forces deregistration even if ids do not match', () => {
      const singleInstanceHandler = new SingleInstanceHandler();
      const instanceId = 'instance-id-12';
      spyOn(Cookies, 'getJSON').and.returnValue({appInstanceId: 'other-instance-id'});
      spyOn(Cookies, 'remove').and.returnValue(undefined);
      singleInstanceHandler.instanceId = instanceId;

      singleInstanceHandler.deregisterInstance(true);

      expect(Cookies.remove).toHaveBeenCalledWith('app_opened');
    });
  });

  describe('hasOtherRunningInstance', () => {
    const singleInstanceHandler = new SingleInstanceHandler();
    it('returns false if the cookie is not set', () => {
      spyOn(Cookies, 'get').and.returnValue(undefined);
      const hasOtherInstance = singleInstanceHandler.hasOtherRunningInstance();

      expect(hasOtherInstance).toBe(false);
    });

    it('throws an error if the current instance has be registered', () => {
      spyOn(Cookies, 'get').and.returnValue({appInstanceId: 'instance-id'});
      const hasOtherInstance = singleInstanceHandler.hasOtherRunningInstance();

      expect(hasOtherInstance).toBe(true);
    });
  });
});
