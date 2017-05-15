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

// grunt test_init && grunt test_run:util/bindings

'use strict';

describe('ko.bindingHandlers', function() {
  describe('ko.bindingHandlers.enter', function() {
    const binding = ko.bindingHandlers.enter;
    let element = null;
    let handler = null;

    beforeEach(function() {
      element = document.createElement('div');

      handler = {
        on_enter() {
          return 'yay';
        },
      };

      // we need the callFake since the spyOn will overwrite the on_enter property
      spyOn(handler, 'on_enter').and.callFake(() => () => 'yay');

      binding.init(element, handler.on_enter);
    });

    it('can execute callback when enter is pressed', function() {
      $(element).trigger($.Event('keypress', {keyCode: 13}));
      expect(handler.on_enter).toHaveBeenCalled();
    });

    it('can not execute callback when another key is pressed', function() {
      $(element).trigger($.Event('keypress', {keyCode: 123}));
      expect(handler.on_enter).not.toHaveBeenCalled();
    });

    it('can not execute callback when another event is triggered', function() {
      $(element).trigger($.Event('keyup', {keyCode: 123}));
      expect(handler.on_enter).not.toHaveBeenCalled();
    });
  });


  describe('ko.subscribable.fn.subscribe_once', function() {
    let observable = null;
    let handler = null;

    beforeEach(function() {
      observable = ko.observable(false);
      handler = {
        callback() {
          return 'yay';
        },
      };

      spyOn(handler, 'callback');
    });

    it('handler is only called once', function() {
      observable.subscribe_once(handler.callback);
      observable(true);
      observable(false);
      expect(handler.callback).toHaveBeenCalled();
      expect(handler.callback.calls.count()).toEqual(1);
      expect(handler.callback).toHaveBeenCalledWith(true);
    });
  });


  describe('ko.subscribable.fn.trimmed', function() {
    let observable = null;

    beforeEach(function() {
      observable = ko.observable('').trimmed();
    });

    it('trims spaces', function() {
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
