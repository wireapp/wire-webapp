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

import {TeamEntity} from './TeamEntity';

describe('TeamEntity', () => {
  it('returns an icon resource', () => {
    const teamEntity = new TeamEntity();

    expect(teamEntity.getIconResource()).not.toBeDefined();

    teamEntity.icon = 'invalid-icon';

    expect(teamEntity.getIconResource()).not.toBeDefined();

    teamEntity.icon = '3-1-e705c3f5-7b4b-4136-a09b-01614cb355a1';

    expect(teamEntity.getIconResource()).toBeDefined();
  });
});
