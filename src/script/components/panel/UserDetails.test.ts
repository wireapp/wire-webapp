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
import {createRandomUuid} from 'Util/util';
import {User} from '../../entity/User';
import UserDetails, {UserDetailsProps} from './UserDetails';
import {ClientEntity} from '../../client/ClientEntity';

class UserDetailsPage extends TestPage<UserDetailsProps> {
  constructor(props: UserDetailsProps) {
    super(UserDetails, props);
  }

  getName = () => this.get('[data-uie-name="status-name"]');
  getVerifiedIcon = () => this.get('[data-uie-name="status-verified-participant"]');
  getUsername = () => this.get('[data-uie-name="status-username"]');
  getExternal = () => this.get('[data-uie-name="status-external"]');
  getGuest = () => this.get('[data-uie-name="status-guest"]');
  getTemporaryGuestText = () => this.get('[data-uie-name="status-expiration-text"]');
  getAdmin = () => this.get('[data-uie-name="status-admin"]');
}

describe('UserDetails', () => {
  it('renders the correct infos for a user', () => {
    const name = 'test-name';
    const userName = 'test-user-name';
    const participant = new User(createRandomUuid(), null);
    participant.name(name);
    participant.username(userName);
    const userDetails = new UserDetailsPage({
      isGroupAdmin: false,
      isSelfVerified: true,
      isVerified: false,
      participant,
    });
    expect(userDetails.getName().text()).toBe(name);
    expect(userDetails.getUsername().text()).toBe(`@${userName}`);
    expect(userDetails.getVerifiedIcon().exists()).toBeFalsy();
    expect(userDetails.getExternal().exists()).toBeFalsy();
    expect(userDetails.getGuest().exists()).toBeFalsy();
    expect(userDetails.getTemporaryGuestText().exists()).toBeFalsy();
    expect(userDetails.getAdmin().exists()).toBeFalsy();
  });

  it('shows a verified icon when all clients from the self user are verified and all clients of the other participant are verified', () => {
    const otherParticipant = new User(createRandomUuid(), null);
    const verifiedClient = new ClientEntity(false, null);
    verifiedClient.meta.isVerified(true);
    otherParticipant.devices.push(verifiedClient);
    const userDetails = new UserDetailsPage({isGroupAdmin: true, isSelfVerified: true, participant: otherParticipant});
    expect(userDetails.getVerifiedIcon().exists()).toBeTruthy();
    expect(userDetails.getAdmin().exists()).toBeTruthy();
  });

  it('renders the badge for a user', () => {
    const badge = 'badgeText';
    const participant = new User(createRandomUuid(), null);
    const userDetails = new UserDetailsPage({
      badge,
      isGroupAdmin: false,
      isSelfVerified: true,
      isVerified: false,
      participant,
    });
    expect(userDetails.getExternal().text()).toBe(badge);
  });

  it('renders the badge for a guest', () => {
    const expirationText = '1h remaining';
    const participant = new User(createRandomUuid(), null);
    participant.isGuest(true);
    participant.isTemporaryGuest(true);
    participant.expirationText(expirationText);
    const userDetails = new UserDetailsPage({
      isGroupAdmin: false,
      isSelfVerified: true,
      isVerified: false,
      participant,
    });
    expect(userDetails.getGuest().exists()).toBeTruthy();
    expect(userDetails.getTemporaryGuestText().text()).toBe(expirationText);
  });
});
