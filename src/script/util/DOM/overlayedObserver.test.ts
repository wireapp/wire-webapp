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

import {overlayedObserver} from './overlayedObserver';

describe('overlayedObserver', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('addElement', () => {
    it('calls the callback right away if the element is not overlayed', () => {
      const callbackSpy = {
        onVisible: () => {},
      };
      spyOn(callbackSpy, 'onVisible');

      const element = document.createElement('div');
      element.style.height = '10px';
      document.body.appendChild(element);
      document.elementFromPoint = () => element;

      overlayedObserver.onElementVisible(element, callbackSpy.onVisible);

      expect(callbackSpy.onVisible).toHaveBeenCalled();
    });

    it('does not call the callback if the element is overlayed', () => {
      const callbackSpy = {
        onVisible: () => {},
      };
      spyOn(callbackSpy, 'onVisible');

      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.height = '100px';
      overlay.style.width = '100px';
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.top = '10px';
      element.style.left = '10px';
      element.style.height = '10px';
      element.style.width = '10px';
      document.body.appendChild(element);
      document.body.appendChild(overlay);
      document.elementFromPoint = () => overlay;

      overlayedObserver.onElementVisible(element, callbackSpy.onVisible);

      expect(callbackSpy.onVisible).not.toHaveBeenCalled();
      overlayedObserver.removeElement(element);
    });

    it('calls the callback when an overlayed element becomes visible', () => {
      const callbackSpy = {
        onVisible: () => {},
      };
      spyOn(callbackSpy, 'onVisible');

      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.height = '100px';
      overlay.style.width = '100px';
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.top = '10px';
      element.style.left = '10px';
      element.style.height = '10px';
      element.style.width = '10px';
      document.body.appendChild(element);
      document.body.appendChild(overlay);
      document.elementFromPoint = () => overlay;

      overlayedObserver.onElementVisible(element, callbackSpy.onVisible);

      expect(callbackSpy.onVisible).not.toHaveBeenCalled();

      document.body.removeChild(overlay);
      document.elementFromPoint = () => element;
      jest.advanceTimersByTime(301);

      expect(callbackSpy.onVisible).toHaveBeenCalled();
    });
  });
});
