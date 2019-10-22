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

import {instantiateComponent} from '../../helper/knockoutHelpers';

import {User} from 'src/script/entity/User';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import 'src/script/components/participantAvatar';

describe('participant-avatar', () => {
  it("displays user's initials if no avatar is defined", () => {
    const testInitials = 'PA';
    const viewModel = {participant: new User()};
    spyOn(viewModel.participant, 'initials').and.returnValue(testInitials);
    return instantiateComponent('participant-avatar', viewModel).then(domContainer => {
      expect(domContainer.querySelector('.avatar-initials').innerText).toBe(testInitials);
    });
  });

  it("loads user's medium avatar when element is visible for HiDPI", () => {
    const viewModel = {participant: new User()};
    const avatarPreview = AssetRemoteData.v3();
    window.devicePixelRatio = 2;
    viewModel.participant.mediumPictureResource(avatarPreview);

    spyOn(avatarPreview, 'getObjectUrl').and.returnValue(Promise.resolve('/avatar'));

    return instantiateComponent('participant-avatar', viewModel).then(domContainer => {
      return new Promise(resolve => {
        setTimeout(() => {
          expect(avatarPreview.getObjectUrl).toHaveBeenCalled();

          const imageElement = domContainer.querySelector('.avatar-image img');

          expect(imageElement.src).toContain('/avatar');
          resolve();
        }, 20);
      });
    });
  });
});
