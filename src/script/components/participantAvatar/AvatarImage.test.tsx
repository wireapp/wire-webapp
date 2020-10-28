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

import AvatarImage, {AvatarImageProps} from './AvatarImage';
import TestPage from 'Util/test/TestPage';
import {User} from '../../entity/User';
import {AssetRepository} from '../../assets/AssetRepository';
import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import {act} from 'react-dom/test-utils';
import {waitFor} from '@testing-library/react';

class AvatarImagePage extends TestPage<AvatarImageProps> {
  constructor(props?: AvatarImageProps) {
    super(AvatarImage, props);
  }

  getImage = () => this.get('img');
}

describe('AvatarImage', () => {
  it('fetches full avatar image for large avatars', async () => {
    const assetRepoSpy = {
      getObjectUrl: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    const assetRepo = (assetRepoSpy as unknown) as AssetRepository;
    const participant = new User('id');
    const resource = {
      downloadProgress: () => 0,
    } as AssetRemoteData;
    participant.mediumPictureResource(resource);

    const avatarImage = new AvatarImagePage({
      assetRepository: assetRepo,
      devicePixelRatio: 2,
      mediumPicture: participant.mediumPictureResource(),
      previewPicture: participant.previewPictureResource(),
      size: AVATAR_SIZE.LARGE,
    });

    avatarImage.update();

    await act(() => waitFor(() => expect(assetRepoSpy.getObjectUrl).toHaveBeenCalledWith(resource)));
  });

  it('fetches preview avatar image for low pixel ratio devices', async () => {
    const assetRepoSpy = {
      getObjectUrl: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    const assetRepo = (assetRepoSpy as unknown) as AssetRepository;
    const participant = new User('id');
    const resource = {
      downloadProgress: () => 0,
    } as AssetRemoteData;
    participant.previewPictureResource(resource);

    const avatarImage = new AvatarImagePage({
      assetRepository: assetRepo,
      devicePixelRatio: 1,
      mediumPicture: participant.mediumPictureResource(),
      previewPicture: participant.previewPictureResource(),
      size: AVATAR_SIZE.LARGE,
    });

    avatarImage.update();

    await act(() => waitFor(() => expect(assetRepoSpy.getObjectUrl).toHaveBeenCalledWith(resource)));
  });

  it('fetches preview avatar image for small avatars', async () => {
    const assetRepoSpy = {
      getObjectUrl: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    const assetRepo = (assetRepoSpy as unknown) as AssetRepository;
    const participant = new User('id');
    participant.previewPictureResource({
      downloadProgress: () => 0,
    } as AssetRemoteData);

    const avatarImage = new AvatarImagePage({
      assetRepository: assetRepo,
      devicePixelRatio: 2,
      mediumPicture: participant.mediumPictureResource(),
      previewPicture: participant.previewPictureResource(),
      size: AVATAR_SIZE.SMALL,
    });

    avatarImage.update();

    await act(() =>
      waitFor(() => expect(assetRepoSpy.getObjectUrl).toHaveBeenCalledWith(participant.previewPictureResource())),
    );
  });

  it('does not try to fetch non-existent avatar', async () => {
    const assetRepoSpy = {
      getObjectUrl: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    const assetRepo = (assetRepoSpy as unknown) as AssetRepository;
    const participant = new User('id');

    const avatarImage = new AvatarImagePage({
      assetRepository: assetRepo,
      mediumPicture: participant.mediumPictureResource(),
      previewPicture: participant.previewPictureResource(),
      size: AVATAR_SIZE.LARGE,
    });

    avatarImage.update();

    await act(() => waitFor(() => expect(assetRepoSpy.getObjectUrl).not.toHaveBeenCalled()));
  });
});
