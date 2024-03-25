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

// eslint-disable-next-line id-length
import ko from 'knockout';

import '../../../src/script/view_model/bindings/CommonBindings';

describe('ko.bindingHandlers', () => {
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
});
