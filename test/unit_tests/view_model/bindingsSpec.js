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

// grunt test_run:view_model/bindings

'use strict';

describe('ko.bindingHandlers', () => {
  describe('ko.bindingHandlers.enter', () => {
    const binding = ko.bindingHandlers.enter;
    let element = null;
    let handler = null;

    beforeEach(() => {
      element = document.createElement('div');

      handler = {
        on_enter: () => 'yay',
      };

      // we need the callFake since the spyOn will overwrite the on_enter property
      spyOn(handler, 'on_enter').and.callFake(() => () => 'yay');

      binding.init(element, handler.on_enter);
    });

    it('can execute callback when enter is pressed', () => {
      $(element).trigger($.Event('keypress', {key: 'Enter'}));

      expect(handler.on_enter).toHaveBeenCalled();
    });

    it('can not execute callback when another key is pressed', () => {
      $(element).trigger($.Event('keypress', {key: 'Esc'}));

      expect(handler.on_enter).not.toHaveBeenCalled();
    });

    it('can not execute callback when another event is triggered', () => {
      $(element).trigger($.Event('keyup', {key: 'Enter'}));

      expect(handler.on_enter).not.toHaveBeenCalled();
    });
  });

  describe('ko.subscribable.fn.subscribe_once', () => {
    let observable = null;
    let handler = null;

    beforeEach(() => {
      observable = ko.observable(false);
      handler = {
        callback: () => 'yay',
      };

      spyOn(handler, 'callback');
    });

    it('handler is only called once', () => {
      observable.subscribe_once(handler.callback);
      observable(true);
      observable(false);

      expect(handler.callback).toHaveBeenCalled();
      expect(handler.callback.calls.count()).toEqual(1);
      expect(handler.callback).toHaveBeenCalledWith(true);
    });
  });

  describe('ko.subscribable.fn.trimmed', () => {
    let observable = null;

    beforeEach(() => {
      observable = ko.observable('').trimmed();
    });

    it('trims spaces', () => {
      observable(' foo');

      expect(observable()).toBe('foo');
      observable('foo ');

      expect(observable()).toBe('foo');
      observable(' foo ');

      expect(observable()).toBe('foo');
      observable(' foo bar ');

      expect(observable()).toBe('foo bar');
    });
  });
});
