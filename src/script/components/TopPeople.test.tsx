/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import TestPage from 'Util/test/TestPage';
import TopPeople, {TopPeopleProps} from 'Components/TopPeople';
import {User} from '../entity/User';

class TopPeoplePage extends TestPage<TopPeopleProps> {
  constructor(props?: TopPeopleProps) {
    super(TopPeople, props);
  }

  getTopPeople = () => this.get('[data-uie-name="item-user"]');
}

describe('TopPeople', () => {
  it('does not render avatars when there are no top people', async () => {
    const topPeoplePage = new TopPeoplePage({
      clickOnContact: () => {},
      users: [],
    });

    expect(topPeoplePage.getTopPeople().length).toBe(0);
  });

  it('renders the defined amount of avatars from top people', async () => {
    const definedAmount = 3;
    const topPeople = [new User('1'), new User('2'), new User('3'), new User('4')];

    const topPeoplePage = new TopPeoplePage({
      clickOnContact: () => {},
      max: definedAmount,
      users: topPeople,
    });

    const renderedAvatars = topPeoplePage.getTopPeople().length;
    expect(renderedAvatars).toBe(definedAmount);
    expect(topPeople.length > renderedAvatars).toBeTruthy();
  });
});
