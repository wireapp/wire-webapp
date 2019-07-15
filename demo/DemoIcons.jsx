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
  ArrowIcon,
  AttachmentIcon,
  AudioVideoIcon,
  CallIcon,
  CamIcon,
  CheckIcon,
  ChromeIcon,
  Container,
  DeviceIcon,
  DownloadIcon,
  EditIcon,
  FacebookIcon,
  FileIcon,
  GifIcon,
  GitHubIcon,
  H1,
  HangupIcon,
  ImageIcon,
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

export const DemoIcons = () => (
  <Container>
    <Line />
    <H1>Icons</H1>
    <div style={{display: 'grid', gridGap: 16, gridTemplateColumns: 'repeat(8, 1fr)'}}>
      <AddPeopleIcon height={32} />
      <ArrowIcon direction="up" height={32} />
      <AttachmentIcon height={32} />
      <AudioVideoIcon height={32} />
      <CallIcon height={32} />
      <CamIcon width={32} />
      <CheckIcon width={32} />
      <DeviceIcon height={32} />
      <DownloadIcon height={32} />
      <EditIcon height={32} />
      <FileIcon height={32} />
      <GifIcon width={32} />
      <HangupIcon width={32} />
      <ImageIcon height={32} />
      <InviteIcon height={32} />
      <LeaveIcon height={32} />
      <MessageIcon height={32} />
      <MoreIcon height={32} />
      <MuteIcon height={32} />
      <OptionsIcon height={32} />
      <PingIcon height={32} />
      <PlaneIcon height={32} />
      <ProfileIcon height={32} />
      <RecordIcon width={32} />
      <RecordPendingIcon width={32} />
      <ScreenshareIcon width={32} />
      <ServicesIcon height={32} />
      <SettingsIcon height={32} />
      <SpeakerIcon height={32} />
      <TeamIcon height={32} />
      <TimedIcon height={32} />
      <TrashIcon height={32} />
      <TriangleIcon height={32} />
      <WireIcon width={32} />
    </div>

    <Line />
    <H1>Shadowed Icons</H1>
    <div style={{display: 'grid', gridGap: 16, gridTemplateColumns: 'repeat(8, 1fr)'}}>
      <AddPeopleIcon height={32} shadow />
      <ArrowIcon direction="up" height={32} shadow />
      <AttachmentIcon height={32} shadow />
      <AudioVideoIcon height={32} shadow />
      <CallIcon height={32} shadow />
      <CamIcon width={32} shadow />
      <CheckIcon width={32} shadow />
      <DeviceIcon height={32} shadow />
      <DownloadIcon height={32} shadow />
      <EditIcon height={32} shadow />
      <FileIcon height={32} shadow />
      <GifIcon width={32} shadow />
      <HangupIcon width={32} shadow />
      <ImageIcon height={32} shadow />
      <InviteIcon height={32} shadow />
      <LeaveIcon height={32} shadow />
      <MessageIcon height={32} shadow />
      <MoreIcon height={32} shadow />
      <MuteIcon height={32} shadow />
      <OptionsIcon height={32} shadow />
      <PingIcon height={32} shadow />
      <PlaneIcon height={32} shadow />
      <ProfileIcon height={32} shadow />
      <RecordIcon width={32} shadow />
      <RecordPendingIcon width={32} shadow />
      <ScreenshareIcon width={32} shadow />
      <ServicesIcon height={32} shadow />
      <SettingsIcon height={32} shadow />
      <SpeakerIcon height={32} shadow />
      <TeamIcon height={32} shadow />
      <TimedIcon height={32} shadow />
      <TrashIcon height={32} shadow />
      <TriangleIcon height={32} shadow />
      <WireIcon width={32} shadow />
    </div>
    <Line />
    <H1>Brand Icons</H1>
    <div style={{display: 'grid', gridGap: 16, gridTemplateColumns: 'repeat(9, 1fr)'}}>
      <AndroidIcon width={48} />
      <AppleIcon width={48} />
      <ChromeIcon width={48} />
      <FacebookIcon width={48} />
      <GitHubIcon width={48} />
      <LinkedInIcon width={48} />
      <LinuxIcon width={48} />
      <MicrosoftIcon width={48} />
      <TwitterIcon width={48} />
    </div>
  </Container>
);
