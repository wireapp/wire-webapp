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

// grunt test_init && grunt test_run:main/SingleInstanceHandler

describe('z.main.SingleInstanceHandler', () => {
  let singleInstanceHandler;

  beforeEach(() => {
    singleInstanceHandler = new z.main.SingleInstanceHandler();
  });

  describe('registerInstance', () => {
    it('registers the current instance', () => {
      const instanceId = 'instance-id-12';
      spyOn(Cookies, 'get').and.returnValue(undefined);
      spyOn(Cookies, 'set').and.returnValue(undefined);
      const result = singleInstanceHandler.registerInstance(instanceId);

      expect(Cookies.set).toHaveBeenCalledWith('app_opened', {appInstanceId: instanceId});
      expect(result).toBe(true);
    });

    it("doesn't register the current instance if instance already running", () => {
      spyOn(Cookies, 'get').and.returnValue(true);
      spyOn(Cookies, 'set').and.returnValue(undefined);
      const result = singleInstanceHandler.registerInstance('instance-id');

      expect(Cookies.set.calls.any()).toBe(false);
      expect(result).toBe(false);
    });
  });

  describe('deregisterInstance', () => {
    it('deregister current instance if the instance id matches the registered instance', () => {
      const instanceId = 'instance-id-12';
      spyOn(Cookies, 'getJSON').and.returnValue({appInstanceId: instanceId});
      spyOn(Cookies, 'remove').and.returnValue(undefined);
      singleInstanceHandler.instanceId = instanceId;

      singleInstanceHandler.deregisterInstance();

      expect(Cookies.remove).toHaveBeenCalledWith('app_opened');
    });

    it('does not deregister current instance if instance ids do not match', () => {
      const instanceId = 'instance-id-12';
      spyOn(Cookies, 'getJSON').and.returnValue({appInstanceId: 'other-instance-id'});
      spyOn(Cookies, 'remove').and.returnValue(undefined);
      singleInstanceHandler.instanceId = instanceId;

      singleInstanceHandler.deregisterInstance();

      expect(Cookies.remove.calls.any()).toBe(false);
    });

    it('forces deregistration even if ids do not match', () => {
      const instanceId = 'instance-id-12';
      spyOn(Cookies, 'getJSON').and.returnValue({appInstanceId: 'other-instance-id'});
      spyOn(Cookies, 'remove').and.returnValue(undefined);
      singleInstanceHandler.instanceId = instanceId;

      singleInstanceHandler.deregisterInstance(true);

      expect(Cookies.remove).toHaveBeenCalledWith('app_opened');
    });
  });

  describe('addExtraInstanceStartedListener', () => {
    it('starts and stops interval when listeners are added/removed', () => {
      const noop = () => {};
      const intervalId = 12;
      spyOn(window, 'setInterval').and.returnValue(intervalId);
      spyOn(window, 'clearInterval').and.returnValue(undefined);

      singleInstanceHandler.addExtraInstanceStartedListener(noop);

      expect(window.setInterval).toHaveBeenCalled();
      expect(window.clearInterval.calls.any()).toBe(false);

      singleInstanceHandler.removeExtraInstanceStartedListener(noop);
      expect(window.clearInterval).toHaveBeenCalledWith(intervalId);
    });

    it('starts interval only once', () => {
      const noop1 = () => {};
      const noop2 = () => {};
      spyOn(window, 'setInterval').and.returnValue(13);
      spyOn(window, 'clearInterval').and.returnValue(undefined);

      singleInstanceHandler.addExtraInstanceStartedListener(noop1);
      singleInstanceHandler.addExtraInstanceStartedListener(noop2);

      expect(window.setInterval.calls.count()).toBe(1);

      singleInstanceHandler.removeExtraInstanceStartedListener(noop1);
      expect(window.clearInterval.calls.any()).toBe(false);

      singleInstanceHandler.removeExtraInstanceStartedListener(noop2);
      expect(window.clearInterval).toHaveBeenCalledWith(13);
    });
  });

  describe('hasOtherRunningInstance', () => {
    it('returns false if the cookie is not set', () => {
      spyOn(Cookies, 'get').and.returnValue(undefined);
      const hasOtherInstance = singleInstanceHandler.hasOtherRunningInstance();
      expect(hasOtherInstance).toBe(false);
    });

    it('throws an error if the current instance has be registered', () => {
      spyOn(Cookies, 'get').and.returnValue('instance-id');
      const hasOtherInstance = singleInstanceHandler.hasOtherRunningInstance();
      expect(hasOtherInstance).toBe(true);
    });
  });
});
