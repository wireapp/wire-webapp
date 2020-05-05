/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import $ from 'jquery';

import {bindHtml} from '../../../helper/knockoutHelpers';

import 'src/script/view_model/bindings/MessageListBindings';

describe('messageListBindings', () => {
  describe('ko.bindingHandlers.infinite_scroll', () => {
    const contentHeight = 1000;
    const scrollingTests = [
      {expectedCalls: ['onHitBottom'], initialScroll: 0, scrollTop: contentHeight},
      {expectedCalls: ['onHitTop'], initialScroll: contentHeight, scrollTop: 0},
      {expectedCalls: [], initialScroll: 0, scrollTop: contentHeight / 2},
    ];

    scrollingTests.forEach(({expectedCalls, initialScroll, scrollTop}) => {
      it('calls params functions when scroll hits top and bottom', () => {
        const context = {
          onHitBottom: () => {},
          onHitTop: () => {},
          onInit: () => {},
        };

        spyOn(context, 'onHitTop');
        spyOn(context, 'onHitBottom');
        spyOn(context, 'onInit');
        const boundElement = `<div style='height: 10px; overflow: scroll' class="scroll" data-bind="{infinite_scroll: {onHitTop, onHitBottom, onInit}}">
        <div style="height: ${contentHeight}px;"></div>
      </div>`;

        return bindHtml(boundElement, context).then(domContainer => {
          const scrollingElement = domContainer.querySelector('.scroll');
          scrollingElement.scrollTop = initialScroll;
          $(scrollingElement).trigger('mousewheel');

          scrollingElement.scrollTop = scrollTop;
          return new Promise(resolve => {
            window.setTimeout(() => {
              expect(context.onInit).toHaveBeenCalledWith(scrollingElement);
              ['onHitBottom', 'onHitTop'].forEach(callback => {
                if (expectedCalls.includes(callback)) {
                  expect(context[callback]).toHaveBeenCalled();
                } else {
                  expect(context[callback]).not.toHaveBeenCalled();
                }
              });
              resolve();
            }, 50);
          });
        });
      });
    });
  });
});
