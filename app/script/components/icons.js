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

'use strict';

ko.components.register('add-participants-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M12 2V0h2v2h2v2h-2v2h-2V4h-2V2h2zm-2.57 8.57A2.57 2.57 0 0 1 12 13.14v1.1a12.8 12.8 0 0 1-12 0v-1.1a2.57 2.57 0 0 1 2.57-2.57h.34a5.97 5.97 0 0 0 6.18 0h.34zM6 8.86A3.43 3.43 0 1 1 6 2a3.43 3.43 0 0 1 0 6.86z"></path>
  </svg>
  `,
});

ko.components.register('archive-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M1 7h14v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7zm6 2a1 1 0 1 0 0 2h2a1 1 0 0 0 0-2H7zM2.5 0h11c.8 0 1.2 0 1.5.3.3.1.6.4.7.7.2.3.3.7.3 1.5V4c0 .6-.4 1-1 1H1a1 1 0 0 1-1-1V2.5C0 1.7 0 1.3.3 1 .4.7.7.4 1 .3c.3-.2.7-.3 1.5-.3z"></path>
  </svg>
  `,
});

ko.components.register('arrow-left-icon', {
  template: `
  <svg width="14" height="16" viewBox="0 0 14 16">
      <path d="M4.83 9l5.24 5.24-1.41 1.41L1 8 8.66.34l1.41 1.41L4.83 7H15v2z"></path>
  </svg>
  `,
});

ko.components.register('attachment-icon', {
  template: `
  <svg width="14" height="16" viewBox="0 0 14 16">
    <path d="M1.63 7.7l4.74-4.78a3.33 3.33 0 0 1 4.73 0 3.4 3.4 0 0 1 0 4.78L9.75 9.07l-4.4 4.43a1.9 1.9 0 0 1-2.7 0 1.94 1.94 0 0 1 0-2.73L4 9.41l4.4-4.45a.47.47 0 0 1 .68 0c.18.2.19.5 0 .69l-4.75 4.79a.97.97 0 0 0 0 1.36c.38.38.98.38 1.36 0l4.74-4.79c.94-.94.93-2.46 0-3.4a2.37 2.37 0 0 0-3.38-.01l-4.4 4.44-1.36 1.37a3.89 3.89 0 0 0 0 5.46 3.8 3.8 0 0 0 5.42 0l4.4-4.44 1.35-1.37a5.34 5.34 0 0 0 0-7.5 5.23 5.23 0 0 0-7.44 0L.28 6.32a.97.97 0 0 0 0 1.37c.37.38.98.38 1.35 0z"></path>
  </svg>
  `,
});

ko.components.register('audio-icon', {
  template: `
  <svg width="12" height="16" viewBox="0 0 12 16">
    <path d="M10.5 12l1.4 1.4a8 8 0 0 1-11.9 0L1.4 12a6 6 0 0 0 9.1 0zM6 12a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4 4 4 0 0 1 4 4v4a4 4 0 0 1-4 4z"></path>
  </svg>
  `,
});

ko.components.register('block-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm4.9-11.48l-.2.19-8.18 8.18a6 6 0 0 0 8.37-8.37zm-1.42-1.41a6 6 0 0 0-8.37 8.37l8.18-8.19.19-.18z"></path>
  </svg>
  `,
});

ko.components.register('camera-icon', {
  template: `
  <svg width="16" height="12" viewBox="0 0 16 12">
    <path id="a" d="M2.6 0h4.8c1 0 1.3 0 1.6.3.3.1.6.4.7.7.2.3.3.7.3 1.6v6.8c0 1 0 1.3-.3 1.6-.1.3-.4.6-.7.7-.3.2-.7.3-1.6.3H2.6c-1 0-1.3 0-1.6-.3-.3-.1-.6-.4-.7-.7-.2-.3-.3-.7-.3-1.6V2.6c0-1 0-1.3.3-1.6C.4.7.7.4 1 .3c.3-.2.7-.3 1.6-.3zm8.7 5.3l3-3A1 1 0 0 1 16 3v6a1 1 0 0 1-1.7.7l-3-3a1 1 0 0 1 0-1.4z"></path>
  </svg>
  `,
});

ko.components.register('check-icon', {
  template: `
  <svg width="16" height="12" viewBox="0 0 16 12">
    <path d="M5.7 11.9L16 1.4 14.6 0 5.7 9 1.4 4.8 0 6.2z"></path>
  </svg>
  `,
});

ko.components.register('chevron-icon', {
  template: `
  <svg width="7" height="4" viewBox="0 0 7 4">
    <path d="M3.65 3.65L6.44.85A.5.5 0 0 0 6.09 0H.5a.5.5 0 0 0-.35.85l2.79 2.8c.2.2.51.2.7 0z"></path>
  </svg>
  `,
});

ko.components.register('close-icon', {
  template: `
  <svg width="14" height="14" viewBox="0 0 14 14">
    <path d="M1.41 13.31l5.25-5.24 5.24 5.24 1.41-1.41-5.24-5.24 5.24-5.25L11.9 0 6.66 5.24 1.41 0 0 1.41l5.24 5.25L0 11.9z"></path>
  </svg>
  `,
});

ko.components.register('copy-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M6 10h8V2H6v8zM5 0h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1zM2 4v10h10v1a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1z"></path>
  </svg>
  `,
});

ko.components.register('delete-icon', {
  template: `
  <svg width="14" height="16" viewBox="0 0 14 16">
    <path d="M5 2a2 2 0 1 1 4 0h4a1 1 0 0 1 1 1v1H0V3a1 1 0 0 1 1-1h4zM1 6h12l-.8 8c-.11 1.1-1.09 2-2.2 2H4c-1.1 0-2.09-.89-2.2-2L1 6zm5.5 2v5.54h1V8h-1z"></path>
  </svg>
  `,
});

ko.components.register('devices-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M11 4h2.4c1 0 1.2.1 1.6.3.3.1.6.4.7.7.2.3.3.7.3 1.6v6.8c0 1-.1 1.2-.3 1.6-.1.3-.4.6-.7.7-.3.2-.7.3-1.6.3H2.6c-1 0-1.2-.1-1.6-.3a1.8 1.8 0 0 1-.7-.7c-.2-.3-.3-.7-.3-1.6V2.6C0 1.6.1 1.4.3 1 .4.7.7.4 1 .3c.4-.2.7-.3 1.6-.3h5.8c1 0 1.2.1 1.6.3.3.1.6.4.7.7.2.4.3.7.3 1.6V4zM9 4V3a1 1 0 0 0-1-1h-.5a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5.5.5 0 0 0-.5-.5H3a1 1 0 0 0-1 1v9.7l.1.8.4.4.8.1H7a8.2 8.2 0 0 1 0-.6V6.6c0-1 .1-1.3.3-1.6.1-.3.4-.6.7-.7.3-.2.5-.3 1-.3zm1.3 2l-.8.1a.9.9 0 0 0-.4.4l-.1.8v5.4l.1.8.4.4.8.1h2.4l.8-.1a.9.9 0 0 0 .4-.4l.1-.8V7.3l-.1-.8a.9.9 0 0 0-.4-.4l-.8-.1h-2.4z"></path>
  </svg>
  `,
});

ko.components.register('disclose-icon', {
  template: `
  <svg width="5" height="8" viewBox="0 0 5 8">
    <path d="M0 .92L.94 0 5 4 .94 8 0 7.08 3.13 4z"></path>
  </svg>
  `,
});

ko.components.register('edit-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M14.55 4.85l.75-.75A2.4 2.4 0 0 0 11.9.7l-.75.75 3.4 3.4zm-.7.7l-9.6 9.6L0 16l.85-4.25 9.6-9.6 3.4 3.4zM4 13.6L2 14l.4-2L4 13.6z"></path>
  </svg>
  `,
});

ko.components.register('file-icon', {
  template: `
  <svg  width="12" height="16" viewBox="0 0 12 16">
    <path d="M1 0a1 1 0 0 0-1 1v14c0 .6.5 1 1 1h10c.6 0 1-.5 1-1V6H8a2 2 0 0 1-2-2V0H1zm11 5H8.4C7.7 5 7 4.4 7 3.7V0l5 5z"></path>
  </svg>
  `,
});

ko.components.register('fullscreen-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M16 7V0H9v2h3.6L8 6.6 9.4 8 14 3.4V7h2zM0 9v7h7v-2H3.4L8 9.4 6.6 8 2 12.6V9H0z"></path>
  </svg>
  `,
});

ko.components.register('gif-icon', {
  template: `
  <svg width="16" height="13" viewBox="0 0 16 13">
    <path d="M12 7.2v5h-2V.2h6v2h-4v3h3v2h-3zm-5-7h2v12H7V.2zm-2 5h1v4.2a3 3 0 0 1-6 0V3a3 3 0 0 1 6 0v.2H4V3a1 1 0 0 0-1-1 1 1 0 0 0-1 1v6.4a1 1 0 0 0 1 1 1 1 0 0 0 1-1V7.2H3v-2h2z"></path>
  </svg>
  `,
});

ko.components.register('group-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M8 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM2 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm12 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
  </svg>
  `,
});

ko.components.register('guest-icon', {
  template: `
  <svg width="14" height="16" viewBox="0 0 14 16">
    <path d="M5 1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3c0-1.1.9-2 2-2h3zm.5 1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-2 1a2 2 0 0 0-2 2v1h8v-1a2 2 0 0 0-2-2H5z"></path>
  </svg>
  `,
});

ko.components.register('hangup-icon', {
  template: `
  <svg width="20" height="8" viewBox="0 0 20 8">
    <path d="M.6 2.7C2.2 1.2 6 0 9.7 0c3.8 0 7.6 1.2 9 2.7 1 .9.9 2.9 0 4.6l-.3.3H18A216 216 0 0 0 14 6c-.4-.1-.3-.1-.3-.5V3.4l-1-.2a13 13 0 0 0-6.2 0l-.9.2V6l-.4.2a155.4 155.4 0 0 0-3.8 1.5c-.4.1-.4.1-.6-.3-1-1.7-1-3.7-.2-4.6z"></path>
  </svg>
  `,
});

ko.components.register('image-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M0 1c0-.6.4-1 1-1h14c.6 0 1 .4 1 1v14c0 .6-.4 1-1 1H1a1 1 0 0 1-1-1V1zm14 1H2v9l4-2 8 3.5V2zm-4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
  </svg>
  `,
});

ko.components.register('info-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path id="a" d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm0-2A6 6 0 1 0 8 2a6 6 0 0 0 0 12zm0-7c.6 0 1 .4 1 1v3a1 1 0 0 1-2 0V8c0-.6.4-1 1-1zm0-1a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"></path>
  </svg>
  `,
});

ko.components.register('link-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M5 3.25A5.79 5.79 0 0 1 10.213 0C13.409 0 16 2.574 16 5.75s-2.591 5.75-5.787 5.75A5.79 5.79 0 0 1 5 8.25h2.4a3.775 3.775 0 0 0 2.813 1.25c2.084 0 3.774-1.679 3.774-3.75 0-2.071-1.69-3.75-3.774-3.75A3.775 3.775 0 0 0 7.4 3.25H5zm6 4.5H8.6A3.775 3.775 0 0 0 5.787 6.5c-2.084 0-3.774 1.679-3.774 3.75 0 2.071 1.69 3.75 3.774 3.75A3.775 3.775 0 0 0 8.6 12.75H11A5.79 5.79 0 0 1 5.787 16C2.591 16 0 13.426 0 10.25S2.591 4.5 5.787 4.5A5.79 5.79 0 0 1 11 7.75z"></path>
  </svg>
  `,
});

ko.components.register('leave-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M2 14h7v2H0V0h9v2H2v12zm3-7v2h7v4l4-5-4-5v4H5z"></path>
  </svg>
  `,
});

ko.components.register('location-icon', {
  template: `
  <svg width="12" height="16" viewBox="0 0 12 16">
    <path d="M12 6c0 6-6 10-6 10S0 12 0 6a6 6 0 1 1 12 0zM6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
  </svg>
  `,
});

ko.components.register('markdown-icon', {
  template: `
  <svg width="15" height="14" viewBox="0 0 15 14">
    <path d="M3.1 0h1.66l3.1 13.88h-2l-.58-2.98h-2.7l-.6 2.98H0L3.1 0zm9.38 12.87h-.04c-.26.36-.52.64-.79.84-.27.2-.64.29-1.12.29-.23 0-.48-.04-.72-.1a1.8 1.8 0 0 1-.7-.4 2.04 2.04 0 0 1-.52-.8c-.14-.34-.2-.79-.2-1.33 0-.56.04-1.05.13-1.47.1-.43.26-.78.5-1.06s.56-.48.96-.62a4.88 4.88 0 0 1 1.97-.19l.53.04V7.04c0-.34-.07-.62-.22-.84-.14-.22-.4-.33-.78-.33-.26 0-.5.08-.7.25a1.2 1.2 0 0 0-.43.74H8.42c.07-.9.37-1.6.9-2.14.26-.26.57-.47.94-.62a3.45 3.45 0 0 1 2.4-.03 2.58 2.58 0 0 1 1.57 1.57c.16.39.24.84.24 1.36v6.88h-2v-1.01zm0-3.24c-.22-.04-.4-.06-.55-.06-.43 0-.8.1-1.1.3-.3.2-.46.57-.46 1.1 0 .38.1.69.28.92a.9.9 0 0 0 .76.36c.33 0 .6-.12.79-.34.18-.22.28-.53.28-.93V9.63zM3.94 4H3.9l-.98 5.03h2L3.93 4z"></path>
  </svg>
  `,
});

ko.components.register('mention-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M8 6.2c-.8 0-1.4.8-1.4 2 0 1.3.6 2 1.4 2 1 0 1.5-.7 1.5-2 0-1.2-.6-2-1.5-2zM8.4 0C13 0 16 3 16 7.3c0 3-1.2 5-3.7 5-1.2 0-2.1-.6-2.4-1.5h-.2c-.4 1-1.1 1.5-2.3 1.5-2 0-3.3-1.7-3.3-4.1 0-2.4 1.3-4 3.2-4a2.4 2.4 0 0 1 2.2 1.3h.2c0-.6.5-1 1-1h.3c.6 0 1 .4 1 1v3.9c0 .7.3 1 .8 1 .9 0 1.3-1 1.3-2.9 0-3.5-2.2-5.8-5.8-5.8C4.6 1.7 2 4.4 2 8.2c0 3.9 2.6 6 6.8 6a11.3 11.3 0 0 0 1.5-.1.7.7 0 0 1 .8.7c0 .5-.4 1-.9 1H10l-1.4.2C3.5 16 0 13 0 8c0-4.7 3.4-8 8.4-8z"></path>
  </svg>
  `,
});

ko.components.register('message-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M3 0h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 0-1.8.7l-2.6 2.1A1 1 0 0 1 0 15V3a3 3 0 0 1 3-3z"></path>
  </svg>
  `,
});

ko.components.register('message-unread-icon', {
  template: `
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path d="M12 2a4 4 0 0 0 4 4v6a3 3 0 0 1-3 3H6a3 3 0 0 0-1.8.7l-2.6 2A1 1 0 0 1 0 17V5a3 3 0 0 1 3-3h9zm4 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
  </svg>
  `,
});

ko.components.register('micoff-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M3.2 14.5a8 8 0 0 0 10.7-1.1L12.4 12A6 6 0 0 1 5 13.2l-1.8 1.3zm8.7-6a4 4 0 0 1-5 3.4l5-3.4zm0-4.5a4 4 0 0 0-4-4 4 4 0 0 0-4 4v4c0 .5 0 1 .2 1.4L.8 11.7l-.8.5L1.1 14l.9-.6 13-9 .8-.5L14.6 2l-.8.6-2 1.3z"></path>
  </svg>
  `,
});

ko.components.register('minus-icon', {
  template: `
  <svg width="16" height="2" viewBox="0 0 16 2">
    <path d="M0 0h16v2H0z"></path>
  </svg>
  `,
});

ko.components.register('mute-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M12 3.2l2-1.4a1 1 0 0 1 1.2 1.6L1.6 13a1 1 0 0 1-1.1-1.6l1.3-.9v-.2S2.7 8.5 3 7.5c.4-1.2 1-4.3 1-4.3C4.3 1.4 6 0 8 0a4 4 0 0 1 4 3.2zm1 4.2v.1l1.2 2.7c.4 1-.1 1.8-1.2 1.8H6.4L13 7.4zM10 14a2 2 0 1 1-4 0h4z"></path>
  </svg>
  `,
});

ko.components.register('notification-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M7 0C5 0 3.3 1.4 3 3.2c0 0-.5 3-1 4.3L.8 10.2C.4 11.2 1 12 2 12h10c1.1 0 1.6-.8 1.2-1.8L12 7.5c-.4-1.2-1-4.3-1-4.3A4 4 0 0 0 7 0zm2 14a2 2 0 1 1-4 0h4z"></path>
  </svg>
  `,
});

ko.components.register('pending-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zm0 2A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM7 7h5v2H7V7zm0-4h2v6H7V3z"></path>
  </svg>
  `,
});

ko.components.register('people-icon', {
  template: `
  <svg width="14" height="16" viewBox="0 0 14 16">
    <path d="M10.6 10h.4a3 3 0 0 1 3 3v1.27a14.93 14.93 0 0 1-14 0V13a3 3 0 0 1 3-3h.4a6.97 6.97 0 0 0 7.2 0zM7 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"></path>
  </svg>
  `,
});

ko.components.register('pickup-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M12.7 16c-2 0-5.6-1.8-8.2-4.5C1.8 9 0 5.3 0 3.3 0 2 1.4.6 3.4.1l.3-.1.3.3a216 216 0 0 0 1.7 3.8c.1.4.1.4-.1.6l-1 1-.5.6.4.7A13 13 0 0 0 9 11.5l.7.4 1.6-1.5.1-.1.1-.1.4.1a155.4 155.4 0 0 0 3.8 1.7c.4.2.3.2.2.6-.5 2-1.9 3.4-3.2 3.4z"></path>
  </svg>
  `,
});

ko.components.register('ping-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M5.95 4.273a1.016 1.016 0 0 0 1.963-.527L7.11.754a1.016 1.016 0 1 0-1.964.526l.802 2.993zm4.101 7.455a1.016 1.016 0 0 0-1.963.526l.802 2.993a1.016 1.016 0 1 0 1.963-.526l-.802-2.993zM3.746 7.913a1.016 1.016 0 0 0 .527-1.964L1.28 5.147a1.016 1.016 0 1 0-.526 1.964l2.992.802zm8.508.175a1.016 1.016 0 1 0-.526 1.963l2.992.802a1.016 1.016 0 0 0 .527-1.963l-2.993-.802zM5.798 11.64a1.016 1.016 0 1 0-1.438-1.437l-2.19 2.19a1.016 1.016 0 1 0 1.436 1.438l2.192-2.19zm4.405-7.28a1.016 1.016 0 1 0 1.437 1.438l2.191-2.191a1.016 1.016 0 0 0-1.437-1.438L10.203 4.36z"></path>
  </svg>
  `,
});

ko.components.register('plus-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M0 7v2h7v7h2V9h7V7H9V0H7v7z"></path>
  </svg>
  `,
});

ko.components.register('profile-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM2 8c0 1.5.56 2.88 1.47 3.94l.08-.46c.15-.82.93-1.48 1.76-1.48h5.38c.83 0 1.61.67 1.76 1.48l.08.46A6 6 0 1 0 2 8zm6 1a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"></path>
  </svg>
  `,
});

ko.components.register('reply-icon', {
  template: `
  <svg width="16" height="15" viewBox="0 0 16 15">
    <path d="M3.3 4h7.1C13.5 4 16 6.6 16 9.6c0 3-2.5 5.4-5.6 5.4H7a1 1 0 0 1 0-2h3.4c2 0 3.6-1.4 3.6-3.4S12.5 6 10.4 6h-7l2.4 2.4a1 1 0 0 1 0 1.3 1 1 0 0 1-1.4 0l-4.1-4a1 1 0 0 1-.2-.3 1 1 0 0 1 .2-1l4-4.1a1 1 0 0 1 1.5 0 1 1 0 0 1 0 1.3L3.3 4z"></path>
  </svg>
  `,
});

ko.components.register('screenshare-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M5 14h6v2H5v-2zM0 1c0-.6.4-1 1-1h14c.6 0 1 .4 1 1v11c0 .6-.4 1-1 1H1a1 1 0 0 1-1-1V1zm7 10h2V7h4L8 3 3 7h4v4z"></path>
  </svg>
  `,
});

ko.components.register('send-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M0 14.3c0 1.5 1 2.1 2.3 1.4L15 9.2c1.3-.7 1.3-1.7 0-2.4L2.3.3C1.1-.4 0 .3 0 1.7V8h12L0 10v4.3z"></path>
  </svg>
  `,
});

ko.components.register('service-icon', {
  template: `
  <svg width="32" height="32" viewBox="0 0 32 32">
    <path d="M10.5 12A6.5 6.5 0 0 0 4 18.5V24a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1v-5.5a6.5 6.5 0 0 0-6.5-6.5h-11zm-7.12-1.22L.24 4.95a2 2 0 1 1 3.52-1.9L6.8 8.68C7.94 8.24 9.19 8 10.5 8h11C27.3 8 32 12.7 32 18.5V24a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5v-5.5c0-3.05 1.3-5.8 3.38-7.72zM11 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0m7 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0m5 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm5.26-9.55a2 2 0 0 1-3.52-1.9l3.5-6.5a2 2 0 0 1 3.52 1.9l-3.5 6.5z"></path>
  </svg>
`,
});

ko.components.register('settings-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M2.8 11a6 6 0 0 1-.6-1.5H0v-3h2.2c.1-.6.3-1 .6-1.5L1.3 3.4l2.1-2.1L5 2.8a6 6 0 0 1 1.5-.6V0h3v2.2c.6.1 1 .3 1.5.6l1.6-1.5 2.1 2.1L13.2 5c.3.4.5 1 .6 1.5H16v3h-2.2a6 6 0 0 1-.6 1.5l1.5 1.6-2.1 2.1-1.6-1.5a6 6 0 0 1-1.5.6V16h-3v-2.2a6 6 0 0 1-1.5-.6l-1.6 1.5-2.1-2.1L2.8 11zM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
  </svg>
  `,
});

ko.components.register('timer-icon', {
  template: `
  <svg width="15" height="16" viewBox="0 0 15 16">
    <path d="M7.44 2v1.08a6.48 6.48 0 0 1 5.45 6.42c0 3.59-2.89 6.5-6.45 6.5A6.47 6.47 0 0 1 0 9.5a6.48 6.48 0 0 1 5.45-6.42V2h-.5a1 1 0 0 1-.98-1 1 1 0 0 1 .99-1h2.97a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-.5zm-1 12a4.48 4.48 0 0 0 4.47-4.5c0-2.49-2-4.5-4.47-4.5a4.48 4.48 0 0 0-4.46 4.5c0 2.49 2 4.5 4.46 4.5zm0-1a3.49 3.49 0 0 1-3.47-3.5C2.97 7.57 4.53 6 6.44 6v3.5l2.47 2.47A3.44 3.44 0 0 1 6.44 13zm6.57-10.3l.7.71a1 1 0 0 1 0 1.42.99.99 0 0 1-1.4 0l-.7-.7a1 1 0 0 1 0-1.42.99.99 0 0 1 1.4 0z"></path>
  </svg>
  `,
});

ko.components.register('undo-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M2.3 2.3a8.3 8.3 0 0 1 4-2.1 8.2 8.2 0 0 1 7.4 2.1A8 8 0 1 1 .3 10h2a6.1 6.1 0 0 0 2.2 2.9A6 6 0 0 0 14 8a6 6 0 0 0-8.3-5.5c-.8.3-1.4.7-2 1.3L7 7H0V0l2.3 2.3z"></path>
  </svg>
  `,
});

ko.components.register('verified-icon', {
  template: `
  <svg width="14" height="16" viewBox="0 0 14 16">
    <path fill="#0097F8" d="M14 1.9L7 0 0 2v6c0 4 3 7.1 7 8 4-.9 7-4 7-8V1.9z"></path>
    <path fill="#0079B6" d="M14 1.9L7 0v16c4-.9 7-4 7-8V1.9z"></path>
  </svg>
  `,
});
