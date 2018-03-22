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
  <svg width="16" height="14" viewBox="0 0 16 14">
    <path d="M0 10h6v2h4v-2h6v4H0v-4zm0-6h6v2h4V4h6v4H0V4zm16-4v2H0V0h16z"></path>
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

ko.components.register('block-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm4.9-11.48l-.2.19-8.18 8.18a6 6 0 0 0 8.37-8.37zm-1.42-1.41a6 6 0 0 0-8.37 8.37l8.18-8.19.19-.18z"></path>
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
    <path d="M11 0H1a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3V1a1 1 0 0 0-1-1zm-1 5H9a1 1 0 0 0-1 1v8H2.5a.5.5 0 0 1-.5-.5v-11c0-.28.23-.5.5-.5h7c.28 0 .5.23.5.5V5zm-4 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"></path>
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

ko.components.register('message-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M9.8 13h.2a6 6 0 0 0 6-6V6a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v1a6 6 0 0 0 6 6h.2L8 16l1.8-3z"></path>
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
    <path d="M2.2 10.74l1.74-7.5h.04C4.23 1.4 5.93 0 8 0c2.07 0 3.77 1.4 4.02 3.23h.04l.15.68 1.8-1.23.84-.57L16 3.75l-.83.57-13.18 9-.84.57L0 12.25l.83-.57 1.38-.94zM6.86 12h7.23l-.98-4.26L6.85 12zm3.18 2c0 1.1-.91 2-2.03 2-1.12 0-2.03-.9-2.03-2h4.06z"></path>
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

ko.components.register('settings-icon', {
  template: `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M2.8 11a6 6 0 0 1-.6-1.5H0v-3h2.2c.1-.6.3-1 .6-1.5L1.3 3.4l2.1-2.1L5 2.8a6 6 0 0 1 1.5-.6V0h3v2.2c.6.1 1 .3 1.5.6l1.6-1.5 2.1 2.1L13.2 5c.3.4.5 1 .6 1.5H16v3h-2.2a6 6 0 0 1-.6 1.5l1.5 1.6-2.1 2.1-1.6-1.5a6 6 0 0 1-1.5.6V16h-3v-2.2a6 6 0 0 1-1.5-.6l-1.6 1.5-2.1-2.1L2.8 11zM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
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
    <path id="a" fill="#0079B6" d="M14 1.87V8c0 4-2.97 7.1-7 8-4-.9-7-4-7-8V2l7-2 7 1.87z"></path>
    <mask id="b">
      <use xlink:href="#a"/>
    </mask>
    <path fill="#0097F8" d="M-3-3H7v23H-3z" mask="url(#b)"></path>
  </svg>
  `,
});
