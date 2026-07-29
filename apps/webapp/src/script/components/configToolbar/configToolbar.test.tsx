/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {openDebugToolbar, openDebugToolbarEventName} from './debugToolbarEvents';

describe('openDebugToolbar', () => {
  it('requests the developer menu to open', () => {
    const openHandler = jest.fn();
    window.addEventListener(openDebugToolbarEventName, openHandler);

    openDebugToolbar();

    expect(openHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener(openDebugToolbarEventName, openHandler);
  });
});
