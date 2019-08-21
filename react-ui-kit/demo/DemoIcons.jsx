/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {
  AddPeopleIcon,
  AndroidIcon,
  AppleIcon,
  ArchiveIcon,
  ArrowIcon,
  AttachmentIcon,
  AudioVideoIcon,
  BlockIcon,
  CallIcon,
  CameraIcon,
  CamIcon,
  CheckIcon,
  ChromeIcon,
  CloseIcon,
  COLOR,
  Container,
  DeviceIcon,
  DownloadIcon,
  EditIcon,
  FacebookIcon,
  FileIcon,
  GifIcon,
  GitHubIcon,
  GroupIcon,
  H1,
  HangupIcon,
  ImageIcon,
  InfoIcon,
  InviteIcon,
  LeaveIcon,
  Line,
  LinkedInIcon,
  LinuxIcon,
  MessageIcon,
  MicrosoftIcon,
  MoreIcon,
  MuteIcon,
  OptionsIcon,
  PingIcon,
  PlaneIcon,
  PlusIcon,
  ProfileIcon,
  RecordIcon,
  RecordPendingIcon,
  ScreenshareIcon,
  ServicesIcon,
  SettingsIcon,
  SpeakerIcon,
  TeamIcon,
  TimedIcon,
  TrashIcon,
  TriangleIcon,
  TwitterIcon,
  WireIcon,
} from '@wireapp/react-ui-kit';
import React from 'react';

const icons = [
  AddPeopleIcon,
  ArchiveIcon,
  ArrowIcon,
  AttachmentIcon,
  AudioVideoIcon,
  BlockIcon,
  CallIcon,
  CameraIcon,
  CamIcon,
  CheckIcon,
  CloseIcon,
  DeviceIcon,
  DownloadIcon,
  EditIcon,
  FileIcon,
  GifIcon,
  GroupIcon,
  HangupIcon,
  ImageIcon,
  InfoIcon,
  InviteIcon,
  LeaveIcon,
  MessageIcon,
  MoreIcon,
  MuteIcon,
  OptionsIcon,
  PingIcon,
  PlaneIcon,
  PlusIcon,
  ProfileIcon,
  RecordIcon,
  RecordPendingIcon,
  ScreenshareIcon,
  ServicesIcon,
  SettingsIcon,
  SpeakerIcon,
  TeamIcon,
  TimedIcon,
  TrashIcon,
  TriangleIcon,
  WireIcon,
];

const brandIcons = [
  AndroidIcon,
  AppleIcon,
  ChromeIcon,
  FacebookIcon,
  GitHubIcon,
  LinkedInIcon,
  LinuxIcon,
  MicrosoftIcon,
  TwitterIcon,
];

export const DemoIcons = () => (
  <Container>
    <Line />
    <H1>Icons</H1>
    <div
      style={{
        alignItems: 'center',
        display: 'grid',
        gridGap: 16,
        gridTemplateColumns: 'repeat(8, 1fr)',
        justifyItems: 'center',
      }}
    >
      {icons.map((Icon, index) => (
        <span key={index} title={Icon.name}>
          <Icon height={32} width={32} />
        </span>
      ))}
    </div>

    <Line />
    <H1>Shadowed Icons</H1>
    <div
      style={{
        alignItems: 'center',
        display: 'grid',
        gridGap: 16,
        gridTemplateColumns: 'repeat(8, 1fr)',
        justifyItems: 'center',
      }}
    >
      {icons.map((Icon, index) => (
        <span key={index} title={Icon.name}>
          <Icon height={32} width={32} shadow color={COLOR.WHITE} />
        </span>
      ))}
    </div>
    <Line />
    <H1>Brand Icons</H1>
    <div
      style={{
        display: 'grid',
        gridGap: 16,
        gridTemplateColumns: `repeat(${brandIcons.length}, 1fr)`,
        justifyItems: 'center',
      }}
    >
      {brandIcons.map((Icon, index) => (
        <span key={index} title={Icon.name}>
          <Icon height={48} width={48} />
        </span>
      ))}
    </div>
  </Container>
);
