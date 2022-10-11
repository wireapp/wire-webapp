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

import {initRouterBindings} from 'src/script/router/routerBindings';
import {bindHtml} from '../../helper/knockoutHelpers';

describe('routerBindings', () => {
  let mockRouter;
  beforeEach(() => {
    mockRouter = {navigate: () => {}};
    initRouterBindings(mockRouter);
    spyOn(mockRouter, 'navigate');
  });

  it('handles click and triggers router navigation', async () => {
    const url = '/conversation/uuid';
    const domElement = await bindHtml(`<a data-bind="link_to: '${url}'">click me</a>`);
    domElement.querySelector('a').click();

    expect(mockRouter.navigate).toHaveBeenCalledWith(url);
  });
});
