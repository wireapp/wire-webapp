/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {render, waitFor} from '@testing-library/react';
import {AVATAR_SIZE} from 'Components/Avatar';
import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {User} from 'Repositories/entity/User';

import {AvatarImage} from './AvatarImage';

describe('AvatarImage', () => {
  it('fetches full avatar image for large avatars', async () => {
    const assetRepoSpy = {
      getObjectUrl: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    const assetRepo = assetRepoSpy as unknown as AssetRepository;
    const participant = new User('id');
    const resource = {
      downloadProgress: 0,
    } as AssetRemoteData;
    participant.mediumPictureResource(resource);

    const props = {
      assetRepository: assetRepo,
      avatarAlt: participant.name(),
      avatarSize: AVATAR_SIZE.LARGE,
      devicePixelRatio: 2,
      mediumPicture: participant.mediumPictureResource(),
      previewPicture: participant.previewPictureResource(),
    };

    render(<AvatarImage {...props} />);

    await waitFor(() => expect(assetRepoSpy.getObjectUrl).toHaveBeenCalledWith(resource));
  });

  it('fetches preview avatar image for low pixel ratio devices', async () => {
    const assetRepoSpy = {
      getObjectUrl: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    const assetRepo = assetRepoSpy as unknown as AssetRepository;
    const participant = new User('id');
    const resource = {
      downloadProgress: 0,
    } as AssetRemoteData;
    participant.previewPictureResource(resource);

    const props = {
      assetRepository: assetRepo,
      avatarAlt: participant.name(),
      avatarSize: AVATAR_SIZE.LARGE,
      devicePixelRatio: 1,
      mediumPicture: participant.mediumPictureResource(),
      previewPicture: participant.previewPictureResource(),
    };

    render(<AvatarImage {...props} />);

    await waitFor(() => expect(assetRepoSpy.getObjectUrl).toHaveBeenCalledWith(resource));
  });

  it('fetches preview avatar image for small avatars', async () => {
    const assetRepoSpy = {
      getObjectUrl: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    const assetRepo = assetRepoSpy as unknown as AssetRepository;
    const participant = new User('id');
    participant.previewPictureResource({
      downloadProgress: 0,
    } as AssetRemoteData);

    const props = {
      assetRepository: assetRepo,
      avatarAlt: participant.name(),
      avatarSize: AVATAR_SIZE.SMALL,
      devicePixelRatio: 2,
      mediumPicture: participant.mediumPictureResource(),
      previewPicture: participant.previewPictureResource(),
    };

    render(<AvatarImage {...props} />);

    await waitFor(() => expect(assetRepoSpy.getObjectUrl).toHaveBeenCalledWith(participant.previewPictureResource()));
  });

  it('does not try to fetch non-existent avatar', async () => {
    const assetRepoSpy = {
      getObjectUrl: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    const assetRepo = assetRepoSpy as unknown as AssetRepository;
    const participant = new User('id');

    const props = {
      assetRepository: assetRepo,
      avatarAlt: participant.name(),
      avatarSize: AVATAR_SIZE.LARGE,
      mediumPicture: participant.mediumPictureResource(),
      previewPicture: participant.previewPictureResource(),
    };

    render(<AvatarImage {...props} />);

    await waitFor(() => expect(assetRepoSpy.getObjectUrl).not.toHaveBeenCalled());
  });
});
