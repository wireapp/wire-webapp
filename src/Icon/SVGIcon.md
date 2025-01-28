Demo:

```js
import React from 'react';
import {
  AddPeopleIcon,
  AndroidIcon,
  AppleIcon,
  ArchiveIcon,
  ArchiveFileIcon,
  AudioFileIcon,
  CodeFileIcon,
  DocumentFileIcon,
  ImageFileIcon,
  PdfFileIcon,
  VideoFileIcon,
  OtherFileIcon,
  ArrowIcon,
  AttachmentIcon,
  AudioVideoIcon,
  BlockIcon,
  CopyIcon,
  CallIcon,
  CameraIcon,
  CamIcon,
  CheckIcon,
  HelpIcon,
  CheckRoundIcon,
  ChevronIcon,
  ChromeIcon,
  CircleCloseIcon,
  CloseIcon,
  COLOR,
  Container,
  DeviceIcon,
  DownloadIcon,
  EditIcon,
  EditDocumentIcon,
  EnterIcon,
  EmojiIcon,
  ErrorIcon,
  ExternalLinkIcon,
  FacebookIcon,
  FileIcon,
  LinkIcon,
  GifIcon,
  GitHubIcon,
  GroupIcon,
  H1,
  HangupIcon,
  ImageIcon,
  SupportIcon,
  InfoIcon,
  InviteIcon,
  LeaveIcon,
  ListIcon,
  Line,
  LinkedInIcon,
  LinuxIcon,
  LockIcon,
  MessageIcon,
  MicrosoftIcon,
  MinusIcon,
  MoreIcon,
  MuteIcon,
  NotificationIcon,
  NotificationOffIcon,
  OptionsIcon,
  GridIcon,
  PeopleIcon,
  PingIcon,
  PlaneIcon,
  PlusIcon,
  ProfileIcon,
  RaiseHandIcon,
  RaiseHandOffIcon,
  RecordIcon,
  RecordBoldIcon,
  RecordPendingIcon,
  ReloadIcon,
  ScreenshareIcon,
  SearchIcon,
  ServicesIcon,
  SettingsIcon,
  SpeakerIcon,
  ShowIcon,
  SignIcon,
  StarIcon,
  TeamIcon,
  TimedIcon,
  TrashIcon,
  TrashCrossIcon,
  HideIcon,
  TriangleIcon,
  TwitterIcon,
  UploadIcon,
  VerificationShieldIcon,
  WireIcon,
  OutlineCheck,
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
  BulletListIcon,
  NumberedListIcon,
  MarkdownIcon,
  HeadingIcon,
  CodeInlineIcon,
  CodeBlockIcon,
  BlockquoteIcon,
} from '@wireapp/react-ui-kit';

const icons = [
  AddPeopleIcon,
  ArchiveIcon,
  ArrowIcon,
  AttachmentIcon,
  AudioVideoIcon,
  BlockIcon,
  CopyIcon,
  CallIcon,
  CameraIcon,
  CamIcon,
  CheckIcon,
  CheckRoundIcon,
  ChevronIcon,
  CircleCloseIcon,
  CloseIcon,
  DeviceIcon,
  DownloadIcon,
  EditIcon,
  EditDocumentIcon,
  EnterIcon,
  EmojiIcon,
  ErrorIcon,
  ExternalLinkIcon,
  FileIcon,
  GifIcon,
  GroupIcon,
  HangupIcon,
  ImageIcon,
  SupportIcon,
  InfoIcon,
  InviteIcon,
  LeaveIcon,
  ListIcon,
  LockIcon,
  MessageIcon,
  MinusIcon,
  MoreIcon,
  MuteIcon,
  NotificationIcon,
  NotificationOffIcon,
  OptionsIcon,
  GridIcon,
  PeopleIcon,
  PingIcon,
  HelpIcon,
  PlaneIcon,
  PlusIcon,
  LinkIcon,
  ProfileIcon,
  RaiseHandIcon,
  RaiseHandOffIcon,
  RecordIcon,
  RecordBoldIcon,
  RecordPendingIcon,
  ReloadIcon,
  ScreenshareIcon,
  SearchIcon,
  ServicesIcon,
  SettingsIcon,
  SpeakerIcon,
  ShowIcon,
  SignIcon,
  StarIcon,
  TeamIcon,
  TimedIcon,
  TrashIcon,
  UploadIcon,
  TrashCrossIcon,
  TriangleIcon,
  HideIcon,
  VerificationShieldIcon,
  WireIcon,
  OutlineCheck,
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
  BulletListIcon,
  NumberedListIcon,
  MarkdownIcon,
  HeadingIcon,
  CodeInlineIcon,
  CodeBlockIcon,
  BlockquoteIcon,
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

const fileIcons = [
  ArchiveFileIcon,
  AudioFileIcon,
  CodeFileIcon,
  DocumentFileIcon,
  ImageFileIcon,
  OtherFileIcon,
  PdfFileIcon,
  VideoFileIcon,
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
      <span key={index} title={Icon.name} style={{border: '1px solid gray'}}>
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
  <Line />
  <H1>File Icons</H1>
  <div
    style={{
      display: 'grid',
      gridGap: 16,
      gridTemplateColumns: `repeat(${fileIcons.length}, 1fr)`,
      justifyItems: 'center',
    }}
  >
    {fileIcons.map((Icon, index) => (
      <span key={index} title={Icon.name}>
        <Icon height={48} width={48} />
      </span>
    ))}
  </div>
</Container>;
```
