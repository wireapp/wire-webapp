/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React, {useEffect, useState} from 'react';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {AssetRepository} from '../../assets/AssetRepository';
import {User} from '../../entity/User';

type BackgroundProps = {
  assetRepository: AssetRepository;
  selfUser: User;
};

const TemporaryGuestBackground: React.FC = () => {
  return <div className="background--white"></div>;
};

const UserBackground: React.FC<BackgroundProps> = ({selfUser, assetRepository}) => {
  const {mediumPictureResource: avatar} = useKoSubscribableChildren(selfUser, ['mediumPictureResource']);
  const [avatarUrl, setAvatarUrl] = useState<string>();

  useEffect(() => {
    if (!avatar) {
      return;
    }
    assetRepository.load(avatar).then(blob => {
      if (blob) {
        setAvatarUrl(window.URL.createObjectURL(blob));
      }
    });
  }, [avatar]);

  const style: React.CSSProperties = avatarUrl ? {backgroundImage: `url(${avatarUrl})`} : undefined;
  return (
    <div className="background">
      <div className="background-image" style={style}></div>
      <div className="background-darken"></div>
    </div>
  );
};

const Background: React.FC<BackgroundProps> = props => {
  const content = props.selfUser.isTemporaryGuest() ? <TemporaryGuestBackground /> : <UserBackground {...props} />;
  return <div id="background">{content}</div>;
};

export default Background;
