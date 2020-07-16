Demo:

```js
import React from 'react';
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
  ChevronIcon,
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
  MinusIcon,
  MoreIcon,
  MuteIcon,
  NotificationIcon,
  NotificationOffIcon,
  OptionsIcon,
  PeopleIcon,
  PingIcon,
  PlaneIcon,
  PlusIcon,
  ProfileIcon,
  RecordIcon,
  RecordPendingIcon,
  ReloadIcon,
  ScreenshareIcon,
  SearchIcon,
  ServicesIcon,
  SettingsIcon,
  SpeakerIcon,
  TeamIcon,
  TimedIcon,
  TrashIcon,
  HideIcon,
  ShowIcon,
  TriangleIcon,
  TwitterIcon,
  WireIcon,
} from '@wireapp/react-ui-kit';

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
  ChevronIcon,
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
  MinusIcon,
  MoreIcon,
  MuteIcon,
  NotificationIcon,
  NotificationOffIcon,
  OptionsIcon,
  PeopleIcon,
  PingIcon,
  PlaneIcon,
  PlusIcon,
  ProfileIcon,
  RecordIcon,
  RecordPendingIcon,
  ReloadIcon,
  ScreenshareIcon,
  SearchIcon,
  ServicesIcon,
  SettingsIcon,
  SpeakerIcon,
  TeamIcon,
  TimedIcon,
  TrashIcon,
  TriangleIcon,
  HideIcon,
  ShowIcon,
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

<Container>
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
</Container>;
```
