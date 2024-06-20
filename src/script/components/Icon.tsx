/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

type IconProps = React.SVGProps<SVGSVGElement>;

export const AboutIcon = (props: IconProps) => {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true" {...props}>
      <path d="M10.9 13.4c2.8 0 5.1-2.3 5.1-5.2V.4h-1.9v7.8a3.2 3.2 0 0 1-3.2 3.3 3.2 3.2 0 0 1-2-.7l.1.8a5.2 5.2 0 0 0 1.3-3.4v-6A2.3 2.3 0 0 0 8 0a2.3 2.3 0 0 0-2.3 2.3v6A5 5 0 0 0 7 11.5v-.8a3.4 3.4 0 0 1-1.9.7A3.3 3.3 0 0 1 2 8.2V.4H0v7.8c0 2.9 2.3 5.2 5.2 5.2a5.2 5.2 0 0 0 3.1-1.1h-.6a5 5 0 0 0 3.2 1zM8.4 2.3v6c0 .7-.3 1.4-.8 2h.8a3.2 3.2 0 0 1-.8-2v-6c0-.2.2-.4.4-.4s.4.2.4.4z"></path>
    </svg>
  );
};
export const AddParticipantsIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M12 2V0h2v2h2v2h-2v2h-2V4h-2V2h2zm-2.57 8.57A2.57 2.57 0 0 1 12 13.14v1.1a12.8 12.8 0 0 1-12 0v-1.1a2.57 2.57 0 0 1 2.57-2.57h.34a5.97 5.97 0 0 0 6.18 0h.34zM6 8.86A3.43 3.43 0 1 1 6 2a3.43 3.43 0 0 1 0 6.86z"></path>
    </svg>
  );
};
export const AnimatedCheckIcon = (props: IconProps) => {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" {...props}>
      <path strokeDasharray="20.65" stroke="#000" strokeWidth="2" fill="none" d="M.7 5.5l5 4.9L15.3.7">
        <animate attributeName="stroke-dashoffset" from="20.65" to="0" dur="500ms" repeatCount="1"></animate>
      </path>
    </svg>
  );
};
export const ArchiveIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M1 7h14v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7zm6 2a1 1 0 1 0 0 2h2a1 1 0 0 0 0-2H7zM2.5 0h11c.8 0 1.2 0 1.5.3.3.1.6.4.7.7.2.3.3.7.3 1.5V4c0 .6-.4 1-1 1H1a1 1 0 0 1-1-1V2.5C0 1.7 0 1.3.3 1 .4.7.7.4 1 .3c.3-.2.7-.3 1.5-.3z"></path>
    </svg>
  );
};
export const ArchiveOutline = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        stroke="#34373D"
        strokeWidth="1.25"
        d="M1.778 6.063v7.261c0 .926.796 1.676 1.778 1.676h8.889c.981 0 1.777-.75 1.777-1.676V6.063"
      ></path>
      <path
        stroke="#34373D"
        strokeWidth="1.25"
        d="M3.196 2h9.608c.723 0 1.016.08 1.3.23.286.151.51.372.662.653.153.282.234.57.234 1.283v2.15H1v-2.15c0-.713.081-1.001.234-1.283a1.58 1.58 0 0 1 .661-.652C2.18 2.08 2.473 2 3.195 2Z"
        clipRule="evenodd"
      ></path>
      <rect width="4" height="1" x="6" y="10" fill="#34373D" rx=".5"></rect>
    </svg>
  );
};
export const ArrowDownLongIcon = (props: IconProps) => {
  return (
    <svg width="16" height="53" viewBox="0 0 16 53" aria-hidden="true" {...props}>
      <path d="M13.9 43l1.4 1.4-7.6 7.7L0 44.4 1.4 43l5.3 5.2V0h2v48.2z"></path>
    </svg>
  );
};
export const ArrowLeftIcon = (props: IconProps) => {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" {...props}>
      <path d="M4.83 9l5.24 5.24-1.41 1.41L1 8 8.66.34l1.41 1.41L4.83 7H15v2z"></path>
    </svg>
  );
};
export const ArrowNextIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M12.572 9l-7.657 7.656L3.5 15.242 9.743 9 3.5 2.757l1.415-1.414z" fill="#FFF" fillRule="evenodd"></path>
    </svg>
  );
};
export const AttachmentIcon = (props: IconProps) => {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" {...props}>
      <path d="M1.63 7.7l4.74-4.78a3.33 3.33 0 0 1 4.73 0 3.4 3.4 0 0 1 0 4.78L9.75 9.07l-4.4 4.43a1.9 1.9 0 0 1-2.7 0 1.94 1.94 0 0 1 0-2.73L4 9.41l4.4-4.45a.47.47 0 0 1 .68 0c.18.2.19.5 0 .69l-4.75 4.79a.97.97 0 0 0 0 1.36c.38.38.98.38 1.36 0l4.74-4.79c.94-.94.93-2.46 0-3.4a2.37 2.37 0 0 0-3.38-.01l-4.4 4.44-1.36 1.37a3.89 3.89 0 0 0 0 5.46 3.8 3.8 0 0 0 5.42 0l4.4-4.44 1.35-1.37a5.34 5.34 0 0 0 0-7.5 5.23 5.23 0 0 0-7.44 0L.28 6.32a.97.97 0 0 0 0 1.37c.37.38.98.38 1.35 0z"></path>
    </svg>
  );
};
export const AudioIcon = (props: IconProps) => {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" {...props}>
      <path d="M10.5 12l1.4 1.4a8 8 0 0 1-11.9 0L1.4 12a6 6 0 0 0 9.1 0zM6 12a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4 4 4 0 0 1 4 4v4a4 4 0 0 1-4 4z"></path>
    </svg>
  );
};
export const AvIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M0 1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V1zm5 13h6v2H5v-2zm-3-4v1h3v-1H2zm0-2v1h3V8H2zm0-2v1h3V6H2zm0-2v1h3V4H2zm4.5 6v1h3v-1h-3zm0-2v1h3V8h-3zm4.5 2v1h3v-1h-3zm0-2v1h3V8h-3zm0-2v1h3V6h-3z"></path>
    </svg>
  );
};
export const AvailabilityAvailableIcon = (props: IconProps) => {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" {...props}>
      <circle cx="5" cy="5" r="5" stroke="none"></circle>
    </svg>
  );
};
export const AvailabilityAwayIcon = (props: IconProps) => {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" {...props}>
      <circle cx="5" cy="5" r="4" strokeWidth="2" fill="none"></circle>
    </svg>
  );
};
export const AvailabilityBusyIcon = (props: IconProps) => {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" {...props}>
      <path d="M5 10A5 5 0 1 1 5 0a5 5 0 0 1 0 10zM3 4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H3z" stroke="none"></path>
    </svg>
  );
};
export const BlockIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm4.9-11.48l-.2.19-8.18 8.18a6 6 0 0 0 8.37-8.37zm-1.42-1.41a6 6 0 0 0-8.37 8.37l8.18-8.19.19-.18z"></path>
    </svg>
  );
};
export const CameraIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M2.564 2h4.872c.892 0 1.215.093 1.54.267.327.174.583.43.757.756.174.326.267.65.267 1.54v6.873c0 .892-.093 1.215-.267 1.54a1.81 1.81 0 01-.756.757c-.326.174-.65.267-1.54.267H2.563c-.892 0-1.215-.093-1.54-.267a1.81 1.81 0 01-.757-.756C.093 12.65 0 12.327 0 11.437V4.563c0-.892.093-1.215.267-1.54a1.81 1.81 0 01.756-.757C1.35 2.093 1.673 2 2.563 2zm8.729 5.296l3.001-2.992A1 1 0 0116 5.012v5.984a1 1 0 01-1.706.708l-3.001-2.991a1.001 1.001 0 01-.002-1.415l.002-.002z"></path>
    </svg>
  );
};
export const CameraOffIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <g fill="#000" fillRule="evenodd">
        <path d="M.061 3.62l9.552 9.552a1.808 1.808 0 01-.636.56c-.301.162-.6.253-1.345.266L2.564 14c-.892 0-1.215-.093-1.54-.267a1.81 1.81 0 01-.757-.756c-.16-.301-.252-.6-.265-1.345L0 4.564c0-.422.02-.716.061-.944zm15.647.686c.187.188.292.442.292.706v5.984a1 1 0 01-1.706.708l-3.001-2.991a1 1 0 01-.085-1.32l.085-.097 3.001-2.992a1 1 0 011.414.002zM10 11.44L.9 2.34l.123-.072c.31-.166.618-.258 1.415-.266L10 9.56v1.878zM7.436 2c.892 0 1.215.093 1.54.267.327.174.583.43.757.756.16.301.252.6.265 1.345L10 7.439 4.56 2h2.876z"></path>
        <path fillRule="nonzero" d="M1.03.47l13.5 13.5-1.06 1.06-13.5-13.5z"></path>
      </g>
    </svg>
  );
};
export const CheckIcon = (props: IconProps) => {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" {...props}>
      <path d="M5.7 11.9L16 1.4 14.6 0 5.7 9 1.4 4.8 0 6.2z"></path>
    </svg>
  );
};
export const ChevronIcon = (props: IconProps) => {
  return (
    <svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true" {...props}>
      <path d="M3.65 3.65L6.44.85A.5.5 0 0 0 6.09 0H.5a.5.5 0 0 0-.35.85l2.79 2.8c.2.2.51.2.7 0z"></path>
    </svg>
  );
};
export const ChevronRight = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        clipRule="evenodd"
        d="m12.5355 8.03553-7.65681-7.656855-1.41421 1.414215 6.24264 6.24264-6.24264 6.24267 1.41421 1.4142z"
        fill="#000"
        fillRule="evenodd"
      ></path>
    </svg>
  );
};
export const CloseIcon = (props: IconProps) => {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" {...props}>
      <path d="M1.41 13.31l5.25-5.24 5.24 5.24 1.41-1.41-5.24-5.24 5.24-5.25L11.9 0 6.66 5.24 1.41 0 0 1.41l5.24 5.25L0 11.9z"></path>
    </svg>
  );
};
export const ConversationsFolderIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M14.93 4.59L4.87 4.57c-1.49 0-1.98 1.67-1.98 2.41L2 14.22c.56 0 .95-.38 1-.8.43-3.1.43-3.33.7-5.53.1-.75.54-1.29 1.3-1.29h9.69c.76 0 1.4.44 1.3 1.29-.32 2.14-.52 3.49-.73 5.07-.21 1.58-1.1 2.48-2.48 2.48H1.88A1.84 1.84 0 010 13.56V1.82C0 1.09.54.55 1.28.55h3.16c.69 0 1.05.02 1.43.59l.43.64c.4.57 1.1.75 1.81.75h5.58c.8 0 1.43.54 1.33 1.32l-.09.74z"></path>
    </svg>
  );
};
export const ConversationsOutline = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        stroke="#34373D"
        strokeWidth="1.25"
        d="M12.22 1H3.78A2.78 2.78 0 0 0 1 3.78v5.012a2.78 2.78 0 0 0 2.78 2.78h.45v3.345c0 .234.272.363.454.216l4.393-3.56h3.142A2.78 2.78 0 0 0 15 8.792V3.781A2.78 2.78 0 0 0 12.22 1Z"
      ></path>
      <path stroke="#34373D" strokeLinecap="round" strokeWidth="1.25" d="M3.625 4.875h8.75M3.625 7.875h4.75"></path>
    </svg>
  );
};
export const ConversationsRecentIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M14.97 9.08H1.03a1.03 1.03 0 110-2.06h13.94a1.03 1.03 0 110 2.06zM14.97 4.96H1.03a1.03 1.03 0 110-2.06h13.94a1.03 1.03 0 110 2.06zM9.82 13.3H1.03a1.03 1.03 0 110-2.06h8.79a1.03 1.03 0 110 2.06z"></path>
    </svg>
  );
};
export const CopyIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M6 10h8V2H6v8zM5 0h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1zM2 4v10h10v1a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1z"></path>
    </svg>
  );
};
export const DeleteIcon = (props: IconProps) => {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" {...props}>
      <path d="M5 2a2 2 0 1 1 4 0h4a1 1 0 0 1 1 1v1H0V3a1 1 0 0 1 1-1h4zM1 6h12l-.8 8c-.11 1.1-1.09 2-2.2 2H4c-1.1 0-2.09-.89-2.2-2L1 6zm5.5 2v5.54h1V8h-1z"></path>
    </svg>
  );
};
export const DesktopIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M1.3 0h13.4l.8.1.4.4.1.8v10.4l-.1.8-.4.4-.8.1H1.3l-.8-.1a1 1 0 0 1-.4-.4l-.1-.8V1.3L.1.5.5.1l.8-.1zM2 2v9h12V2H2zm3 12h6v2H5v-2z"></path>
    </svg>
  );
};
export const DevicesIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M11 4h2.4c1 0 1.2.1 1.6.3.3.1.6.4.7.7.2.3.3.7.3 1.6v6.8c0 1-.1 1.2-.3 1.6-.1.3-.4.6-.7.7-.3.2-.7.3-1.6.3H2.6c-1 0-1.2-.1-1.6-.3a1.8 1.8 0 0 1-.7-.7c-.2-.3-.3-.7-.3-1.6V2.6C0 1.6.1 1.4.3 1 .4.7.7.4 1 .3c.4-.2.7-.3 1.6-.3h5.8c1 0 1.2.1 1.6.3.3.1.6.4.7.7.2.4.3.7.3 1.6V4zM9 4V3a1 1 0 0 0-1-1h-.5a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5.5.5 0 0 0-.5-.5H3a1 1 0 0 0-1 1v9.7l.1.8.4.4.8.1H7a8.2 8.2 0 0 1 0-.6V6.6c0-1 .1-1.3.3-1.6.1-.3.4-.6.7-.7.3-.2.5-.3 1-.3zm1.3 2l-.8.1a.9.9 0 0 0-.4.4l-.1.8v5.4l.1.8.4.4.8.1h2.4l.8-.1a.9.9 0 0 0 .4-.4l.1-.8V7.3l-.1-.8a.9.9 0 0 0-.4-.4l-.8-.1h-2.4z"></path>
    </svg>
  );
};
export const DiscloseIcon = (props: IconProps) => {
  return (
    <svg width="5" height="8" viewBox="0 0 5 8" aria-hidden="true" {...props}>
      <path d="M0 .92L.94 0 5 4 .94 8 0 7.08 3.13 4z"></path>
    </svg>
  );
};
export const EditIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M14.55 4.85l.75-.75A2.4 2.4 0 0 0 11.9.7l-.75.75 3.4 3.4zm-.7.7l-9.6 9.6L0 16l.85-4.25 9.6-9.6 3.4 3.4zM4 13.6L2 14l.4-2L4 13.6z"></path>
    </svg>
  );
};
export const EllipsisIcon = (props: IconProps) => {
  return (
    <svg width="16" height="4" viewBox="0 0 16 4" aria-hidden="true" {...props}>
      <path d="M2 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
    </svg>
  );
};
export const EraserIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M14.9 11.7h-4.5l5.1-5.1c.8-.8.8-2 0-2.8L12.4.7A2 2 0 0 0 11 .1a2 2 0 0 0-1.4.6L2.9 7.4a3 3 0 0 0-.1 4.1l1.6 1.7h10.4c.4 0 .7-.3.7-.7.1-.5-.2-.8-.6-.8zM4 8.5l1.7-1.7 3.7 3.7-1.1 1.2H5.1L4 10.4c-.6-.5-.5-1.4 0-1.9zM2.3 12.4c0-.4-.3-.7-.7-.7H.7c-.4 0-.7.3-.7.7 0 .4.3.7.7.7h.8c.5.1.8-.3.8-.7zM2.8 14.1l-.6.6c-.3.3-.3.8 0 1 .1.2.3.2.5.2l.5-.2.6-.6c.3-.3.3-.8 0-1-.2-.3-.7-.3-1 0z"></path>
    </svg>
  );
};
export const ExclamationMark = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14ZM9 4V9H7V4H9ZM9 12V10H7V12H9Z"
        fill="#C20013"
      ></path>
    </svg>
  );
};
export const ExternalIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="M2 2h12c1.1 0 2 .77 2 1.71v8.58c0 .94-.9 1.71-2 1.71H2c-1.1 0-2-.77-2-1.71V3.7C0 2.77.9 2 2 2zm3.38 4v1H3.25v1h2v.92h-2v1h2.13v1.01H2V6h3.38zm1.65 0l.9 1.67h.04L8.87 6h1.4L8.69 8.45v.01l1.56 2.47h-1.4l-.97-1.6h-.03l-.95 1.6H5.57l1.5-2.48v-.02L5.57 6h1.46zm7.34 0v1h-1.42v3.93H11.7V7.01h-1.43V6h4.1z"
        fillRule="evenodd"
      ></path>
    </svg>
  );
};
export const FederationIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M13 11a2 2 0 00-1 .3l-1.5-1.6a3 3 0 000-3.4L12 4.7c.3.2.6.3 1 .3a2 2 0 10-2-2c0 .4.1.7.3 1L9.7 5.5a3 3 0 00-3.4 0L4.7 4c.2-.3.3-.6.3-1a2 2 0 10-2 2 2 2 0 001-.3l1.5 1.6a3 3 0 000 3.4L4 11.3a2 2 0 00-1-.3 2 2 0 102 2 2 2 0 00-.3-1l1.6-1.5a3 3 0 003.4 0l1.6 1.5a2 2 0 00-.3 1 2 2 0 102-2zm-5-1a2 2 0 110-4 2 2 0 010 4z"></path>
    </svg>
  );
};
export const FileIcon = (props: IconProps) => {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" {...props}>
      <path d="M1 0a1 1 0 0 0-1 1v14c0 .6.5 1 1 1h10c.6 0 1-.5 1-1V6H8a2 2 0 0 1-2-2V0H1zm11 5H8.4C7.7 5 7 4.4 7 3.7V0l5 5z"></path>
    </svg>
  );
};
export const FoldersOutline = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        stroke="#34373D"
        strokeWidth="1.25"
        d="M5.416 2.222H2.333a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h9.334a2 2 0 0 0 2-2V6.444a2 2 0 0 0-2-2h-3.86a1 1 0 0 1-.64-.231l-2.111-1.76a1 1 0 0 0-.64-.23Z"
      ></path>
      <path stroke="#34373D" strokeLinecap="round" strokeWidth="1.25" d="M9.514 2.042h4.083"></path>
    </svg>
  );
};
export const FullscreenIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M16 7V0H9v2h3.6L8 6.6 9.4 8 14 3.4V7h2zM0 9v7h7v-2H3.4L8 9.4 6.6 8 2 12.6V9H0z"></path>
    </svg>
  );
};
export const GifIcon = (props: IconProps) => {
  return (
    <svg width="16" height="13" viewBox="0 0 16 13" aria-hidden="true" {...props}>
      <path d="M12 7.2v5h-2V.2h6v2h-4v3h3v2h-3zm-5-7h2v12H7V.2zm-2 5h1v4.2a3 3 0 0 1-6 0V3a3 3 0 0 1 6 0v.2H4V3a1 1 0 0 0-1-1 1 1 0 0 0-1 1v6.4a1 1 0 0 0 1 1 1 1 0 0 0 1-1V7.2H3v-2h2z"></path>
    </svg>
  );
};
export const GroupAdminIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="M13.82 0C15.02 0 16 .97 16 2.18v8.21c0 1.2-.97 2.18-2.18 2.18H4.26L0 16V2.18C0 .98.97 0 2.18 0zM6.37 2.37c-.12-.12-.23-.1-.33-.04l-.8.48c-.13.07-.17.16-.14.31.14.9-.17 1.67-.95 2.33a.87.87 0 01-.12.09c-.1.06-.23.1-.34.15l-.03.01a.5.5 0 00-.08.04c-.1.05-.14.13-.14.25v.61L3.43 7c0 .14.05.23.18.28.46.17.82.5 1.11 1.04.3.53.38 1.06.26 1.63-.03.12.01.21.12.28.3.2.56.37.83.53.03.03.08.04.12.05.04 0 .08 0 .11-.03a.32.32 0 00.07-.06c.1-.1.2-.18.31-.25.35-.2.84-.3 1.32-.25.5.05.93.25 1.18.54.03.04.08.07.13.1h.06c.06 0 .13-.01.18-.05l.38-.23.39-.22c.18-.11.17-.25.15-.36-.1-.39-.03-.88.2-1.35.21-.47.54-.86.9-1.07.12-.07.24-.12.36-.15.06-.01.13-.04.17-.13A62.17 62.17 0 0012 6.13c0-.12-.05-.2-.16-.25a2.1 2.1 0 01-1.16-1.1 2.3 2.3 0 01-.23-1.56c.03-.14-.01-.24-.13-.3l-.28-.2L10 2.7l-.46-.3a.25.25 0 00-.28 0 .51.51 0 00-.07.05l-.03.02c-.09.08-.19.16-.3.22a2.7 2.7 0 01-1.24.26 1.94 1.94 0 01-1.24-.57zm1.34 2.2a2 2 0 110 4 2 2 0 010-4z"
        fillRule="nonzero"
      ></path>
    </svg>
  );
};
export const GroupIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M8 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM2 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm12 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
    </svg>
  );
};
export const GuestIcon = (props: IconProps) => {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" {...props}>
      <path d="M5 1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3c0-1.1.9-2 2-2h3zm.5 1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-2 1a2 2 0 0 0-2 2v1h8v-1a2 2 0 0 0-2-2H5z"></path>
    </svg>
  );
};
export const HangupIcon = (props: IconProps) => {
  return (
    <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true" {...props}>
      <path d="M.6 2.7C2.2 1.2 6 0 9.7 0c3.8 0 7.6 1.2 9 2.7 1 .9.9 2.9 0 4.6l-.3.3H18A216 216 0 0 0 14 6c-.4-.1-.3-.1-.3-.5V3.4l-1-.2a13 13 0 0 0-6.2 0l-.9.2V6l-.4.2a155.4 155.4 0 0 0-3.8 1.5c-.4.1-.4.1-.6-.3-1-1.7-1-3.7-.2-4.6z"></path>
    </svg>
  );
};
export const ImageIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M0 1c0-.6.4-1 1-1h14c.6 0 1 .4 1 1v14c0 .6-.4 1-1 1H1a1 1 0 0 1-1-1V1zm14 1H2v9l4-2 8 3.5V2zm-4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
    </svg>
  );
};
export const InfoIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        id="a"
        d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm0-2A6 6 0 1 0 8 2a6 6 0 0 0 0 12zm0-7c.6 0 1 .4 1 1v3a1 1 0 0 1-2 0V8c0-.6.4-1 1-1zm0-1a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
      ></path>
    </svg>
  );
};
export const LeaveIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M2 14h7v2H0V0h9v2H2v12zm3-7v2h7v4l4-5-4-5v4H5z"></path>
    </svg>
  );
};
export const LikeIcon = (props: IconProps) => {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true" {...props}>
      <path d="M8.2 11.6c.9-.5 1.7-1.1 2.5-1.8 2.1-1.7 3.3-3.5 3.3-5 0-1-.2-1.7-.7-2.1-.9-1-2.4-1-3.3 0l-2 2-2-2c-1-1-2.4-1-3.3 0-.5.4-.7 1-.7 2.1 0 1.5 1.2 3.3 3.3 5a21.7 21.7 0 0 0 2.7 2l.2-.2zM8 1.9l.6-.6a4.4 4.4 0 0 1 6.1 0c.9.8 1.3 2 1.3 3.5C16 10 8 14 8 14s-8-4-8-9.2c0-1.5.4-2.7 1.3-3.5a4.4 4.4 0 0 1 6 0l.7.6z"></path>
    </svg>
  );
};
export const LinkIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M5 3.25A5.79 5.79 0 0 1 10.213 0C13.409 0 16 2.574 16 5.75s-2.591 5.75-5.787 5.75A5.79 5.79 0 0 1 5 8.25h2.4a3.775 3.775 0 0 0 2.813 1.25c2.084 0 3.774-1.679 3.774-3.75 0-2.071-1.69-3.75-3.774-3.75A3.775 3.775 0 0 0 7.4 3.25H5zm6 4.5H8.6A3.775 3.775 0 0 0 5.787 6.5c-2.084 0-3.774 1.679-3.774 3.75 0 2.071 1.69 3.75 3.774 3.75A3.775 3.775 0 0 0 8.6 12.75H11A5.79 5.79 0 0 1 5.787 16C2.591 16 0 13.426 0 10.25S2.591 4.5 5.787 4.5A5.79 5.79 0 0 1 11 7.75z"></path>
    </svg>
  );
};
export const LoadingIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        transform="rotate(0 8 8)"
        d="M12.42 12.42a6.17 6.17 0 0 1-8.72-.12 6.16 6.16 0 0 1-.12-8.72A6.07 6.07 0 0 1 9.93 2.2a.92.92 0 1 0 .6-1.73A7.91 7.91 0 0 0 2.3 2.3 8 8 0 0 0 2.4 13.6a8 8 0 0 0 11.31.11 7.91 7.91 0 0 0 1.83-8.25.92.92 0 0 0-1.73.61 6.08 6.08 0 0 1-1.4 6.35z"
      >
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 8 8"
          to="360 8 8"
          dur="1s"
          repeatCount="indefinite"
        ></animateTransform>
      </path>
    </svg>
  );
};
export const LocationIcon = (props: IconProps) => {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" {...props}>
      <path d="M12 6c0 6-6 10-6 10S0 12 0 6a6 6 0 1 1 12 0zM6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
    </svg>
  );
};
export const LogoFullIcon = (props: IconProps) => {
  return (
    <svg width="78" height="25" viewBox="0 0 78 25" aria-hidden="true" {...props}>
      <path d="M14.73 19.79a7.25 7.25 0 0 1-1.74-4.7V3.43a1.73 1.73 0 0 1 3.47 0v11.64a7.2 7.2 0 0 1-1.73 4.7zm13-4.7A7.32 7.32 0 0 1 16 20.95a8.94 8.94 0 0 0 2.18-5.88V3.44a3.46 3.46 0 1 0-6.93 0v11.64c0 2.25.87 4.3 2.24 5.88a7.4 7.4 0 0 1-11.77-5.88V.88H0v14.2a9.1 9.1 0 0 0 14.78 7.08 9.05 9.05 0 0 0 14.67-7.08V.88h-1.73v14.2zm6.92 8.57h1.74V.84h-1.74v22.82zM51.55.44a9.99 9.99 0 0 0-8.23 4.33V.84h-1.74v22.82h1.74V10.34c0-4.5 3.7-8.18 8.23-8.18V.44zM54.8 18.8a10.1 10.1 0 0 1 .59-13.68 10.23 10.23 0 0 1 13.75-.58L54.8 18.8zM71.6 4.54a11.97 11.97 0 0 0-17.44-.63 11.8 11.8 0 0 0 0 16.74 11.97 11.97 0 0 0 16.85 0l-1.23-1.21a10.23 10.23 0 0 1-13.75.58l7.17-7.13 8.4-8.35zm2.72-3.07v-.34h-1.88v.34h.74v1.9h.4v-1.9h.74zm2.8 1.9V1.14h-.56l-.64 1.75-.65-1.75h-.58v2.25h.39V1.55l.66 1.83h.33l.67-1.84v1.84h.39z"></path>
    </svg>
  );
};
export const LogoIcon = (props: IconProps) => {
  return (
    <svg width="48" height="39" viewBox="0 0 48 39" aria-hidden="true" {...props}>
      <path d="M23.2 0c3 0 5.4 2.5 5.4 5.5V24c0 3.6-1.3 6.9-3.4 9.4A11.5 11.5 0 0043.6 24V1.4h2.7V24c0 8-6.4 14.4-14.2 14.4a14 14 0 01-8.9-3.1c-2.4 2-5.5 3.1-8.8 3.1C6.4 38.4 0 31.9 0 24V1.4h2.7V24a11.7 11.7 0 0018.5 9.4 14.4 14.4 0 01-3.5-9.4V5.5c0-3 2.5-5.5 5.5-5.5zm0 2.7a2.7 2.7 0 00-2.8 2.8V24c0 2.9 1 5.5 2.8 7.5 1.7-2 2.7-4.6 2.7-7.5V5.5c0-1.5-1.2-2.8-2.7-2.8z"></path>
    </svg>
  );
};
export const MarkdownIcon = (props: IconProps) => {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" aria-hidden="true" {...props}>
      <path d="M3.1 0h1.66l3.1 13.88h-2l-.58-2.98h-2.7l-.6 2.98H0L3.1 0zm9.38 12.87h-.04c-.26.36-.52.64-.79.84-.27.2-.64.29-1.12.29-.23 0-.48-.04-.72-.1a1.8 1.8 0 0 1-.7-.4 2.04 2.04 0 0 1-.52-.8c-.14-.34-.2-.79-.2-1.33 0-.56.04-1.05.13-1.47.1-.43.26-.78.5-1.06s.56-.48.96-.62a4.88 4.88 0 0 1 1.97-.19l.53.04V7.04c0-.34-.07-.62-.22-.84-.14-.22-.4-.33-.78-.33-.26 0-.5.08-.7.25a1.2 1.2 0 0 0-.43.74H8.42c.07-.9.37-1.6.9-2.14.26-.26.57-.47.94-.62a3.45 3.45 0 0 1 2.4-.03 2.58 2.58 0 0 1 1.57 1.57c.16.39.24.84.24 1.36v6.88h-2v-1.01zm0-3.24c-.22-.04-.4-.06-.55-.06-.43 0-.8.1-1.1.3-.3.2-.46.57-.46 1.1 0 .38.1.69.28.92a.9.9 0 0 0 .76.36c.33 0 .6-.12.79-.34.18-.22.28-.53.28-.93V9.63zM3.94 4H3.9l-.98 5.03h2L3.93 4z"></path>
    </svg>
  );
};
export const MentionIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M8 6.2c-.8 0-1.4.8-1.4 2 0 1.3.6 2 1.4 2 1 0 1.5-.7 1.5-2 0-1.2-.6-2-1.5-2zM8.4 0C13 0 16 3 16 7.3c0 3-1.2 5-3.7 5-1.2 0-2.1-.6-2.4-1.5h-.2c-.4 1-1.1 1.5-2.3 1.5-2 0-3.3-1.7-3.3-4.1 0-2.4 1.3-4 3.2-4a2.4 2.4 0 0 1 2.2 1.3h.2c0-.6.5-1 1-1h.3c.6 0 1 .4 1 1v3.9c0 .7.3 1 .8 1 .9 0 1.3-1 1.3-2.9 0-3.5-2.2-5.8-5.8-5.8C4.6 1.7 2 4.4 2 8.2c0 3.9 2.6 6 6.8 6a11.3 11.3 0 0 0 1.5-.1.7.7 0 0 1 .8.7c0 .5-.4 1-.9 1H10l-1.4.2C3.5 16 0 13 0 8c0-4.7 3.4-8 8.4-8z"></path>
    </svg>
  );
};
export const MessageIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M3 0h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 0-1.8.7l-2.6 2.1A1 1 0 0 1 0 15V3a3 3 0 0 1 3-3z"></path>
    </svg>
  );
};
export const MessageUnreadIcon = (props: IconProps) => {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...props}>
      <path d="M12 2a4 4 0 0 0 4 4v6a3 3 0 0 1-3 3H6a3 3 0 0 0-1.8.7l-2.6 2A1 1 0 0 1 0 17V5a3 3 0 0 1 3-3h9zm4 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
    </svg>
  );
};
export const MicOffIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M3.75 7.25V8a4.25 4.25 0 007.225 3.035l1.06 1.06a5.73 5.73 0 01-3.285 1.606V16h-1.5v-2.298a5.752 5.752 0 01-4.996-5.481L2.25 8v-.75h1.5zM5 5.06l5.091 5.091A3 3 0 015 8V5.06zm8.75 2.19V8c0 1.06-.286 2.052-.786 2.904l-1.11-1.11a4.223 4.223 0 00.391-1.588L12.25 8v-.75h1.5zM8 1a3 3 0 013 3v4c0 .286-.04.563-.115.825L5.143 3.083A3.001 3.001 0 018 1z"></path>
      <path fillRule="nonzero" d="M1.03.97l14 14-1.06 1.06-14-14z"></path>
    </svg>
  );
};
export const MicOnIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M11 4a3 3 0 00-6 0v4a3 3 0 006 0V4z"></path>
      <path d="M3.75 7.25V8a4.25 4.25 0 008.5.2v-.95h1.5V8a5.75 5.75 0 01-5 5.7V16h-1.5v-2.3a5.75 5.75 0 01-5-5.48v-.97h1.5z"></path>
    </svg>
  );
};
export const MinusIcon = (props: IconProps) => {
  return (
    <svg width="16" height="2" viewBox="0 0 16 2" aria-hidden="true" {...props}>
      <path d="M0 0h16v2H0z"></path>
    </svg>
  );
};
export const MuteIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M12 3.2l2-1.4a1 1 0 0 1 1.2 1.6L1.6 13a1 1 0 0 1-1.1-1.6l1.3-.9v-.2S2.7 8.5 3 7.5c.4-1.2 1-4.3 1-4.3C4.3 1.4 6 0 8 0a4 4 0 0 1 4 3.2zm1 4.2v.1l1.2 2.7c.4 1-.1 1.8-1.2 1.8H6.4L13 7.4zM10 14a2 2 0 1 1-4 0h4z"></path>
    </svg>
  );
};
export const NetworkIcon = (props: IconProps) => {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.56709 1.14897C2.97204 0.77342 3.60476 0.79725 3.98031 1.20219C4.35586 1.60714 4.33203 2.23986 3.92708 2.61541C2.70957 3.74454 2.00586 5.32259 2.00586 7.01585C2.00586 8.75865 2.75171 10.3786 4.03204 11.5114C4.44568 11.8773 4.48433 12.5093 4.11837 12.923C3.75242 13.3366 3.12043 13.3752 2.7068 13.0093C1.0018 11.5008 0.00585938 9.33765 0.00585938 7.01585C0.00585938 4.76016 0.945639 2.65272 2.56709 1.14897ZM13.2567 13.0516C12.8401 13.4143 12.2085 13.3706 11.8458 12.954C11.4832 12.5375 11.5269 11.9058 11.9434 11.5432C13.2454 10.4097 14.0059 8.77554 14.0059 7.01585C14.0059 5.26957 13.257 3.64664 11.9722 2.51373C11.558 2.14846 11.5183 1.51654 11.8835 1.1023C12.2488 0.68806 12.8807 0.648364 13.295 1.01364C15.0059 2.52231 16.0059 4.6894 16.0059 7.01585C16.0059 9.36019 14.9904 11.5423 13.2567 13.0516ZM5.34694 4.02748C5.75945 3.66025 6.39155 3.69696 6.75878 4.10946C7.126 4.52197 7.0893 5.15407 6.67679 5.5213C6.25219 5.89929 6.00586 6.43654 6.00586 7.01585C6.00586 7.59524 6.25225 8.13255 6.67694 8.51055C7.08949 8.87773 7.12626 9.50983 6.75907 9.92237C6.39189 10.3349 5.75979 10.3717 5.34725 10.0045C4.50053 9.25089 4.00586 8.17214 4.00586 7.01585C4.00586 5.85971 4.50041 4.78109 5.34694 4.02748ZM10.6811 9.98959C10.2706 10.3591 9.63834 10.3258 9.26887 9.91532C8.89939 9.50482 8.93265 8.87253 9.34314 8.50306C9.76283 8.12531 10.0059 7.59132 10.0059 7.01585C10.0059 6.43701 9.75994 5.90016 9.33593 5.52219C8.92367 5.15469 8.88739 4.52257 9.25489 4.1103C9.62239 3.69804 10.2545 3.66176 10.6668 4.02926C11.5121 4.78282 12.0059 5.86065 12.0059 7.01585C12.0059 8.16429 11.5179 9.23644 10.6811 9.98959Z"
        fill="black"
      ></path>
    </svg>
  );
};
export const NotVerifiedIcon = (props: IconProps) => {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" {...props}>
      <path
        fill="#0097F8"
        d="M14 1.9V8c0 4-3 7-7 8-4-1-7-4-7-8V2l7-2 7 1.9zm-7-1L.8 2.5V8c0 3.4 2.5 6.3 6.2 7.2V.8z"
      ></path>
    </svg>
  );
};
export const NotificationIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M7 0C5 0 3.3 1.4 3 3.2c0 0-.5 3-1 4.3L.8 10.2C.4 11.2 1 12 2 12h10c1.1 0 1.6-.8 1.2-1.8L12 7.5c-.4-1.2-1-4.3-1-4.3A4 4 0 0 0 7 0zm2 14a2 2 0 1 1-4 0h4z"></path>
    </svg>
  );
};
export const OptionsIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M9.7 15H15a1 1 0 1 0 0-2H9.7a2 2 0 0 0-3.4 0H1a1 1 0 1 0 0 2h5.3a2 2 0 0 0 3.4 0zm-3-6H15a1 1 0 1 0 0-2H6.7a2 2 0 0 0-3.4 0H1a1 1 0 1 0 0 2h2.3a2 2 0 0 0 3.4 0zm6-6H15a1 1 0 1 0 0-2h-2.3a2 2 0 0 0-3.4 0H1a1 1 0 1 0 0 2h8.3a2 2 0 0 0 3.4 0z"></path>
    </svg>
  );
};
export const PartnerIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M4 9a2 2 0 110-4 2 2 0 010 4zm4 4.27a5.85 5.85 0 01-1.2.98 5.43 5.43 0 01-3.08.74A5.4 5.4 0 010 13.12V12a2 2 0 012-2h4a2 2 0 012 2v1.27zM12 5a2 2 0 110-4 2 2 0 010 4zm4 4.27a5.85 5.85 0 01-1.2.98 5.43 5.43 0 01-3.08.74A5.4 5.4 0 018 9.13V8a2 2 0 012-2h4a2 2 0 012 2v1.27z"></path>
    </svg>
  );
};
export const PendingIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zm0 2A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM7 7h5v2H7V7zm0-4h2v6H7V3z"></path>
    </svg>
  );
};
export const PeopleIcon = (props: IconProps) => {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" {...props}>
      <path d="M10.6 10h.4a3 3 0 0 1 3 3v1.27a14.93 14.93 0 0 1-14 0V13a3 3 0 0 1 3-3h.4a6.97 6.97 0 0 0 7.2 0zM7 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"></path>
    </svg>
  );
};
export const PeopleOutline = (props: IconProps) => {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" aria-hidden="true" {...props}>
      <path
        fill="#34373D"
        d="M11.145 10.469v-.625a.625.625 0 0 0-.327.092l.327.533Zm3.272 4.203.296.55a.625.625 0 0 0 .329-.55h-.625Zm-13.5 0H.292c0 .23.126.44.328.55l.297-.55Zm3.27-4.203.328-.533a.625.625 0 0 0-.327-.092v.625Zm6.958.625h.376v-1.25h-.376v1.25Zm.376 0c1.242 0 2.27 1.033 2.27 2.328h1.25c0-1.96-1.564-3.578-3.52-3.578v1.25Zm2.27 2.328v1.25h1.25v-1.25h-1.25Zm.329.7a13.542 13.542 0 0 1-6.453 1.628V17c2.544 0 4.943-.643 7.046-1.778l-.593-1.1ZM7.667 15.75c-2.332 0-4.527-.588-6.454-1.628l-.593 1.1A14.792 14.792 0 0 0 7.667 17v-1.25Zm-6.125-1.078v-1.25H.292v1.25h1.25Zm0-1.25c0-1.298 1.026-2.328 2.27-2.328v-1.25c-1.958 0-3.52 1.614-3.52 3.578h1.25Zm2.27-2.328h.376v-1.25h-.375v1.25ZM3.86 11a7.24 7.24 0 0 0 3.807 1.077v-1.25a5.99 5.99 0 0 1-3.152-.892l-.655 1.065Zm3.807 1.077a7.24 7.24 0 0 0 3.806-1.077l-.655-1.065a5.99 5.99 0 0 1-3.151.892v1.25Zm0-2.953c2.487 0 4.482-2.055 4.482-4.563h-1.25c0 1.842-1.46 3.313-3.232 3.313v1.25Zm4.482-4.563C12.149 2.055 10.154 0 7.667 0v1.25c1.773 0 3.232 1.47 3.232 3.313h1.25ZM7.667 0C5.179 0 3.184 2.055 3.184 4.563h1.25c0-1.842 1.46-3.313 3.233-3.313V0ZM3.184 4.563c0 2.507 1.995 4.562 4.483 4.562v-1.25c-1.773 0-3.233-1.47-3.233-3.313h-1.25Z"
      ></path>
    </svg>
  );
};
export const PickupIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M12.7 16c-2 0-5.6-1.8-8.2-4.5C1.8 9 0 5.3 0 3.3 0 2 1.4.6 3.4.1l.3-.1.3.3a216 216 0 0 0 1.7 3.8c.1.4.1.4-.1.6l-1 1-.5.6.4.7A13 13 0 0 0 9 11.5l.7.4 1.6-1.5.1-.1.1-.1.4.1a155.4 155.4 0 0 0 3.8 1.7c.4.2.3.2.2.6-.5 2-1.9 3.4-3.2 3.4z"></path>
    </svg>
  );
};
export const PingIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M5.95 4.273a1.016 1.016 0 0 0 1.963-.527L7.11.754a1.016 1.016 0 1 0-1.964.526l.802 2.993zm4.101 7.455a1.016 1.016 0 0 0-1.963.526l.802 2.993a1.016 1.016 0 1 0 1.963-.526l-.802-2.993zM3.746 7.913a1.016 1.016 0 0 0 .527-1.964L1.28 5.147a1.016 1.016 0 1 0-.526 1.964l2.992.802zm8.508.175a1.016 1.016 0 1 0-.526 1.963l2.992.802a1.016 1.016 0 0 0 .527-1.963l-2.993-.802zM5.798 11.64a1.016 1.016 0 1 0-1.438-1.437l-2.19 2.19a1.016 1.016 0 1 0 1.436 1.438l2.192-2.19zm4.405-7.28a1.016 1.016 0 1 0 1.437 1.438l2.191-2.191a1.016 1.016 0 0 0-1.437-1.438L10.203 4.36z"></path>
    </svg>
  );
};
export const PlusIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M0 7v2h7v7h2V9h7V7H9V0H7v7z"></path>
    </svg>
  );
};
export const ProfileIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM2 8c0 1.5.56 2.88 1.47 3.94l.08-.46c.15-.82.93-1.48 1.76-1.48h5.38c.83 0 1.61.67 1.76 1.48l.08.46A6 6 0 1 0 2 8zm6 1a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"></path>
    </svg>
  );
};
export const ReadIcon = (props: IconProps) => {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" {...props}>
      <path d="M16 6a8.5 8.5 0 0 1-8 6 8.5 8.5 0 0 1-8-6c1.2-3.5 4.3-6 8-6s6.8 2.5 8 6zM8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
    </svg>
  );
};
export const ReplyIcon = (props: IconProps) => {
  return (
    <svg width="16" height="15" viewBox="0 0 16 15" aria-hidden="true" {...props}>
      <path d="M3.3 4h7.1C13.5 4 16 6.6 16 9.6c0 3-2.5 5.4-5.6 5.4H7a1 1 0 0 1 0-2h3.4c2 0 3.6-1.4 3.6-3.4S12.5 6 10.4 6h-7l2.4 2.4a1 1 0 0 1 0 1.3 1 1 0 0 1-1.4 0l-4.1-4a1 1 0 0 1-.2-.3 1 1 0 0 1 .2-1l4-4.1a1 1 0 0 1 1.5 0 1 1 0 0 1 0 1.3L3.3 4z"></path>
    </svg>
  );
};
export const ScreenshareIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M12 13v2H4v-2zm2.124-12c.484 0 .876.379.876.845v9.31c0 .467-.39.845-.876.845H9V8h4L8 3 3 8h4l-.001 4H1.876C1.392 12 1 11.621 1 11.155v-9.31C1 1.378 1.39 1 1.876 1h12.248z"></path>
    </svg>
  );
};
export const ScreenshareOffIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M11.094 13l.905.9L12 15H4v-2h7.094zM1 2.949l9.029 8.99H1.876c-.484 0-.876-.344-.876-.768V2.949zm2.849-1.01l10.046 10h-1.954l-10.045-10h1.953zm10.275 0c.484 0 .876.344.876.768v8.429L5.762 1.939h8.362z"></path>
      <path d="M2.03-.03l14 14-1.06 1.06-14-14z"></path>
    </svg>
  );
};
export const SendIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M0 14.3c0 1.5 1 2.1 2.3 1.4L15 9.2c1.3-.7 1.3-1.7 0-2.4L2.3.3C1.1-.4 0 .3 0 1.7V8h12L0 10v4.3z"></path>
    </svg>
  );
};
export const ServiceIcon = (props: IconProps) => {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <path d="M10.5 12A6.5 6.5 0 0 0 4 18.5V24a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1v-5.5a6.5 6.5 0 0 0-6.5-6.5h-11zm-7.12-1.22L.24 4.95a2 2 0 1 1 3.52-1.9L6.8 8.68C7.94 8.24 9.19 8 10.5 8h11C27.3 8 32 12.7 32 18.5V24a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5v-5.5c0-3.05 1.3-5.8 3.38-7.72zM11 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0m7 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0m5 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm5.26-9.55a2 2 0 0 1-3.52-1.9l3.5-6.5a2 2 0 0 1 3.52 1.9l-3.5 6.5z"></path>
    </svg>
  );
};
export const SettingsIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M2.8 11a6 6 0 0 1-.6-1.5H0v-3h2.2c.1-.6.3-1 .6-1.5L1.3 3.4l2.1-2.1L5 2.8a6 6 0 0 1 1.5-.6V0h3v2.2c.6.1 1 .3 1.5.6l1.6-1.5 2.1 2.1L13.2 5c.3.4.5 1 .6 1.5H16v3h-2.2a6 6 0 0 1-.6 1.5l1.5 1.6-2.1 2.1-1.6-1.5a6 6 0 0 1-1.5.6V16h-3v-2.2a6 6 0 0 1-1.5-.6l-1.6 1.5-2.1-2.1L2.8 11zM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
    </svg>
  );
};
export const ShieldIcon = (props: IconProps) => {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 8V1.87197L7 0L0 2V8C0 12 3.00718 15.0977 7 16C11.0344 15.0977 14 12 14 8ZM6.98678 1.55625L7 1.56002V14.4558L6.99817 14.4563C3.68611 13.589 1.5 11.0575 1.5 8L1.5 3.02354L6.98678 1.55625Z"
        fill="#34373D"
      ></path>
    </svg>
  );
};
export const SpeakerIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="m.5 4-.4.2-.1.4v6.8l.1.4.4.2H5l5 4V0L5 4ZM12 6V4q.8 0 1.6.3.7.3 1.2.9.6.5.9 1.2.3.8.3 1.6t-.3 1.6q-.3.7-.9 1.2-.5.6-1.2.9-.8.3-1.6.3v-2q.8 0 1.4-.6.6-.6.6-1.4 0-.8-.6-1.4Q12.8 6 12 6Z"></path>
    </svg>
  );
};
export const TimerIcon = (props: IconProps) => {
  return (
    <svg width="15" height="16" viewBox="0 0 15 16" aria-hidden="true" {...props}>
      <path d="M7.44 2v1.08a6.48 6.48 0 0 1 5.45 6.42c0 3.59-2.89 6.5-6.45 6.5A6.47 6.47 0 0 1 0 9.5a6.48 6.48 0 0 1 5.45-6.42V2h-.5a1 1 0 0 1-.98-1 1 1 0 0 1 .99-1h2.97a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-.5zm-1 12a4.48 4.48 0 0 0 4.47-4.5c0-2.49-2-4.5-4.47-4.5a4.48 4.48 0 0 0-4.46 4.5c0 2.49 2 4.5 4.46 4.5zm0-1a3.49 3.49 0 0 1-3.47-3.5C2.97 7.57 4.53 6 6.44 6v3.5l2.47 2.47A3.44 3.44 0 0 1 6.44 13zm6.57-10.3l.7.71a1 1 0 0 1 0 1.42.99.99 0 0 1-1.4 0l-.7-.7a1 1 0 0 1 0-1.42.99.99 0 0 1 1.4 0z"></path>
    </svg>
  );
};
export const UndoIcon = (props: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M2.3 2.3a8.3 8.3 0 0 1 4-2.1 8.2 8.2 0 0 1 7.4 2.1A8 8 0 1 1 .3 10h2a6.1 6.1 0 0 0 2.2 2.9A6 6 0 0 0 14 8a6 6 0 0 0-8.3-5.5c-.8.3-1.4.7-2 1.3L7 7H0V0l2.3 2.3z"></path>
    </svg>
  );
};
export const VerifiedIcon = (props: IconProps) => {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" {...props}>
      <path fill="#0097F8" d="M14 1.9L7 0 0 2v6c0 4 3 7.1 7 8 4-.9 7-4 7-8V1.9z"></path>
      <path fill="#0079B6" d="M14 1.9L7 0v16c4-.9 7-4 7-8V1.9z"></path>
    </svg>
  );
};
export const WatermarkIcon = (props: IconProps) => {
  return (
    <svg width="288" height="374" viewBox="0 0 288 374" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M5.65 140.47a2.82 2.82 0 1 1-5.65 0V48.7a2.82 2.82 0 0 1 2.82-2.83c8.83 0 18.21-.87 28.09-2.56 20.7-3.53 42.84-10.47 65.42-19.81a446.55 446.55 0 0 0 33.32-15.44 362.62 362.62 0 0 0 9.54-5.08 221.3 221.3 0 0 0 3.17-1.78c1.1-.64 2.19-.64 3.07-.12l.85.49 2.53 1.42a363.75 363.75 0 0 0 9.54 5.07 446.55 446.55 0 0 0 33.32 15.44c22.58 9.34 44.73 16.28 65.42 19.81a167.63 167.63 0 0 0 28.09 2.56A2.82 2.82 0 0 1 288 48.7v36.7a2.82 2.82 0 1 1-5.65 0V51.5a177.14 177.14 0 0 1-26.2-2.62c-21.17-3.62-43.7-10.67-66.64-20.17a452.25 452.25 0 0 1-33.74-15.62 367.54 367.54 0 0 1-9.7-5.16L144 6.77l-2.07 1.16a368.54 368.54 0 0 1-9.7 5.16A452.27 452.27 0 0 1 98.5 28.72C75.56 38.2 53.02 45.27 31.86 48.88a177 177 0 0 1-26.21 2.61v88.98zm240 125.63a18.35 18.35 0 1 1 0-36.7 18.35 18.35 0 0 1 0 36.7m0-42.35a24 24 0 1 0 0 48 24 24 0 0 0 0-48m12.74 26.9a2.82 2.82 0 0 0-3.89.9c-1.66 2.66-4.27 3.97-8.2 3.97-3.98 0-6.88-1.37-8.98-4.17a2.82 2.82 0 0 0-4.52 3.39c3.2 4.26 7.79 6.42 13.5 6.42 5.8 0 10.24-2.22 13-6.62a2.82 2.82 0 0 0-.9-3.89m-5.47-4.89a3.3 3.3 0 1 0 0-6.61 3.3 3.3 0 0 0 0 6.61m-13.24 0a3.3 3.3 0 1 0 0-6.61 3.3 3.3 0 0 0 0 6.61m39.84-151.88h-50.84a2.82 2.82 0 1 1 0-5.64c.15 0 .32.01.5.05a2.82 2.82 0 0 0 3.16-3.74 14.06 14.06 0 0 1-.84-4.78c0-7.8 6.33-14.12 14.12-14.12a14.12 14.12 0 0 1 13.33 9.45 2.83 2.83 0 0 0 2.9 1.88c.33-.03.53-.04.72-.04a8.47 8.47 0 0 1 8.47 8.47 2.82 2.82 0 0 0 5.65 0c0-7.48-5.82-13.6-13.19-14.09A19.77 19.77 0 0 0 245.64 60a19.77 19.77 0 0 0-19.51 22.98 8.47 8.47 0 0 0 2.56 16.55h50.84c2.2 0 2.82.62 2.82 2.82v127.06c0 41.97-19.5 77.42-52.6 103.67-27.03 21.45-61.57 34.69-85.79 34.69-12.76 0-29.3-3.89-46.04-11.04a172.47 172.47 0 0 1-50.8-33.25 2.82 2.82 0 1 0-3.9 4.09c29.33 27.96 71.15 45.84 100.74 45.84 25.56 0 61.32-13.7 89.31-35.9C267.63 310.24 288 273.22 288 229.4V102.35c0-5.32-3.15-8.47-8.47-8.47M53.65 110.81H19.77a2.82 2.82 0 0 1-2.83-2.82V62.8a2.82 2.82 0 0 1 2.83-2.82h22.58c.75 0 1.47.3 2 .82l11.3 11.3c.52.53.82 1.24.82 2v33.88a2.82 2.82 0 0 1-2.82 2.82zm-2.83-5.65V75.27l-9.64-9.64h-18.6v39.53h28.24zM31.18 84a2.88 2.88 0 0 1-2.95-2.83 2.88 2.88 0 0 1 2.95-2.82h11.05a2.88 2.88 0 0 1 2.95 2.82A2.88 2.88 0 0 1 42.23 84H31.18zm0 9.88a2.88 2.88 0 0 1-2.95-2.83 2.88 2.88 0 0 1 2.95-2.82h11.05a2.88 2.88 0 0 1 2.95 2.83 2.88 2.88 0 0 1-2.95 2.82H31.18zM144 187.04a8.47 8.47 0 1 1 0 16.94 8.47 8.47 0 0 1 0-16.94m0 22.6a14.12 14.12 0 1 0 0-28.24 14.12 14.12 0 0 0 0 28.23m14.12 16.94h-28.24v-8.47c0-1.36.43-2 1.27-2.41.3-.16.67-.27 1.03-.34l10.56 5.28c.8.4 1.73.4 2.52 0l10.64-5.32c.95.12 1.46.53 1.81 1.23a4.11 4.11 0 0 1 .4 1.56v8.47zm5.52-9.81a9.63 9.63 0 0 0-.88-2.74c-1.34-2.7-3.89-4.39-7.47-4.39-.43 0-.87.1-1.26.3L144 214.95l-10.03-5.02a2.82 2.82 0 0 0-1.26-.3c-.33 0-.79.04-1.35.13a9.63 9.63 0 0 0-2.74.88c-2.69 1.34-4.39 3.88-4.39 7.46v11.3a2.82 2.82 0 0 0 2.83 2.82h33.88a2.82 2.82 0 0 0 2.82-2.82v-11.3c0-.32-.03-.78-.12-1.34zM144 131.28a8.47 8.47 0 1 1 0 16.94 8.47 8.47 0 0 1 0-16.94m0 22.59a14.12 14.12 0 1 0 0-28.24 14.12 14.12 0 0 0 0 28.24m14.12 16.94h-28.24v-8.47c0-1.36.43-2 1.27-2.42.3-.15.67-.27 1.03-.33l10.56 5.28c.8.4 1.73.4 2.52 0l10.64-5.32c.95.11 1.46.52 1.81 1.23a4.08 4.08 0 0 1 .4 1.56v8.47zm5.52-9.82a9.63 9.63 0 0 0-.88-2.74c-1.34-2.69-3.89-4.38-7.47-4.38-.43 0-.87.1-1.26.3L144 159.18l-10.03-5.01a2.83 2.83 0 0 0-1.26-.3c-.33 0-.79.03-1.35.12a9.65 9.65 0 0 0-2.74.88c-2.69 1.35-4.39 3.89-4.39 7.47v11.3a2.82 2.82 0 0 0 2.83 2.82h33.88a2.82 2.82 0 0 0 2.82-2.83v-11.3c0-.31-.03-.77-.12-1.34zM192 170.1a8.47 8.47 0 1 1 0 16.94 8.47 8.47 0 0 1 0-16.94m0 22.6a14.12 14.12 0 1 0 0-28.24 14.12 14.12 0 0 0 0 28.23m14.12 16.94h-28.24v-8.47c0-1.36.43-2 1.27-2.41a3.97 3.97 0 0 1 1.03-.34l10.56 5.28c.8.4 1.73.4 2.52 0l10.64-5.32c.95.12 1.46.53 1.81 1.23a4.1 4.1 0 0 1 .4 1.56v8.47zm5.52-9.81a9.63 9.63 0 0 0-.88-2.74c-1.34-2.7-3.89-4.39-7.47-4.39-.43 0-.87.1-1.26.3L192 198.01l-10.03-5.02a2.82 2.82 0 0 0-1.26-.3c-.33 0-.79.04-1.35.13a9.63 9.63 0 0 0-2.74.88c-2.69 1.34-4.39 3.88-4.39 7.46v11.3a2.82 2.82 0 0 0 2.83 2.82h33.88a2.82 2.82 0 0 0 2.83-2.82v-11.3c0-.32-.04-.78-.13-1.34zM96 170.8a8.47 8.47 0 1 1 0 16.94 8.47 8.47 0 0 1 0-16.94m0 22.59a14.12 14.12 0 1 0 0-28.24 14.12 14.12 0 0 0 0 28.24m14.12 16.94H81.88v-8.47c0-1.36.43-2 1.27-2.42.3-.15.67-.27 1.03-.33l10.56 5.27c.8.4 1.73.4 2.52 0l10.64-5.31c.95.11 1.46.52 1.81 1.23a4.1 4.1 0 0 1 .4 1.56v8.47zm5.52-9.82a9.68 9.68 0 0 0-.88-2.74c-1.34-2.69-3.89-4.38-7.47-4.38-.43 0-.87.1-1.26.3L96 198.7l-10.03-5.01a2.82 2.82 0 0 0-1.26-.3c-.33 0-.79.03-1.35.13a9.63 9.63 0 0 0-2.74.87c-2.69 1.35-4.39 3.89-4.39 7.47v11.3a2.82 2.82 0 0 0 2.83 2.82h33.88a2.82 2.82 0 0 0 2.82-2.83v-11.3c0-.31-.03-.78-.12-1.34zM67.76 311.28h-3.53c-.23 0-.25 0-.82-.58-1.54-1.55-2.7-2.24-4.82-2.24s-3.28.7-4.82 2.24c-.58.57-.6.58-.83.58-.24 0-.25 0-.83-.58-1.54-1.55-2.7-2.24-4.82-2.24-2.11 0-3.28.7-4.82 2.24-.57.57-.59.58-.82.58-.24 0-.25 0-.83-.58-1.54-1.55-2.7-2.24-4.82-2.24-.46 0-1.65-.64-3.11-1.89a36.09 36.09 0 0 1-4.5-4.74A126.21 126.21 0 0 1 5.64 229.4v-66.25-.05-.05c0-8.65 4.34-12.63 14.14-12.71h23.27c.75 0 1.47-.3 2-.83l6.47-6.47v3.06a2.82 2.82 0 0 0 5.65 0v-9.88c0-.19-.02-.37-.06-.54l-.01-.08a2.72 2.72 0 0 0-.16-.48 2.76 2.76 0 0 0-.97-1.2l-.1-.06a2.98 2.98 0 0 0-.38-.21l-.06-.03a2.92 2.92 0 0 0-.47-.15l-.1-.02a2.83 2.83 0 0 0-.65-.05h-9.75a2.82 2.82 0 0 0 0 5.65h3.06l-5.64 5.64H19.76C6.96 144.8 0 151.17 0 163.04v66.36c0 27.82 8.52 53.67 23.8 75.72l.06.08.05.08c4.19 5.23 8.42 8.82 12.09 8.82.24 0 .25.01.83.59 1.54 1.54 2.7 2.24 4.82 2.24s3.28-.7 4.82-2.24c.57-.58.59-.59.82-.59s.25.01.83.59c1.54 1.54 2.7 2.24 4.82 2.24s3.28-.7 4.82-2.24c.58-.58.6-.59.83-.59s.25.01.82.59c1.55 1.54 2.7 2.24 4.82 2.24h3.53a2.82 2.82 0 0 0 0-5.65m31.06-14.78l-2.49-4.99h4.98l-2.49 4.98zm-4.23-46.63h8.47v-3.53h-8.47v3.53zm0 36h8.47V255.5h-8.47v30.36zm14.11 2.84V243.52a2.82 2.82 0 0 0-2.82-2.83H91.77a2.82 2.82 0 0 0-2.83 2.83V288.7a2.8 2.8 0 0 0 .26 1.14l.04.1 7.06 14.12a2.82 2.82 0 0 0 5.05 0l7.06-14.12.04-.1a2.77 2.77 0 0 0 .25-1.14zm1.42 19.75a2.82 2.82 0 0 1 0-5.65c1.41 0 2.01-.36 3.65-2 2.6-2.6 4.35-3.65 7.64-3.65 3.3 0 5.05 1.05 7.65 3.65 1.63 1.64 2.23 2 3.65 2 1.4 0 2.01-.36 3.65-2 2.6-2.6 4.35-3.65 7.64-3.65s5.04 1.05 7.64 3.65c1.64 1.64 2.24 2 3.65 2 1.42 0 2.02-.36 3.65-2 2.6-2.6 4.36-3.65 7.65-3.65 3.3 0 5.04 1.05 7.64 3.65 1.64 1.64 2.24 2 3.65 2a2.82 2.82 0 0 1 0 5.65c-3.29 0-5.04-1.05-7.64-3.65-1.64-1.64-2.24-2-3.65-2-1.41 0-2.02.36-3.65 2-2.6 2.6-4.35 3.65-7.65 3.65-3.29 0-5.04-1.05-7.64-3.65-1.63-1.64-2.24-2-3.65-2-1.41 0-2.01.36-3.65 2-2.6 2.6-4.35 3.65-7.64 3.65s-5.05-1.05-7.65-3.65c-1.63-1.64-2.23-2-3.65-2-1.41 0-2.01.36-3.65 2-2.6 2.6-4.35 3.65-7.64 3.65m28.23-227.99h11.3v-5.65h-11.3v5.65zm-8.47-25.41a14.12 14.12 0 1 1 16.94 13.83v-8.18a2.82 2.82 0 0 0-.82-2l-.83-.83h4.48a2.82 2.82 0 0 0 0-5.65h-11.3a2.82 2.82 0 0 0-2 4.83l4.83 4.81v7.02c-6.45-1.3-11.3-7-11.3-13.83zm33.89 0a19.77 19.77 0 1 0-31.06 16.22V83.3a2.82 2.82 0 0 0 2.82 2.82h16.94a2.82 2.82 0 0 0 2.82-2.83V71.27a19.73 19.73 0 0 0 8.47-16.21zm-16.95-25.43a2.82 2.82 0 0 1-5.64 0V24a2.82 2.82 0 0 1 5.64 0v5.64zm17.53 9.06a2.82 2.82 0 1 1-4-4l4.24-4.23a2.82 2.82 0 1 1 4 4l-4.24 4.23zm5.06 19.2a2.82 2.82 0 0 1 0-5.66h5.65a2.82 2.82 0 0 1 0 5.65h-5.65zm-45.76-19.2a2.82 2.82 0 0 0 4-4l-4.24-4.23a2.82 2.82 0 0 0-4 4l4.24 4.23zm-10.7 19.2a2.82 2.82 0 0 1 0-5.66h5.64a2.82 2.82 0 0 1 0 5.65h-5.65zm87.52 16.23h11.01a14.13 14.13 0 0 0-11-11.01v11zm-2.82 5.64a2.82 2.82 0 0 1-2.83-2.82V60a2.82 2.82 0 0 1 2.83-2.82 19.77 19.77 0 0 1 19.76 19.76 2.82 2.82 0 0 1-2.82 2.83h-16.94zm-9.18 9.18a2.82 2.82 0 0 1-2.82-2.82V69.41a16.95 16.95 0 0 0 2.82 33.65 17.1 17.1 0 0 0 16.67-14.12h-16.67zm2.83-5.64h16.94a2.82 2.82 0 0 1 2.82 2.85c-.13 12.4-10.23 22.56-22.59 22.56a22.6 22.6 0 0 1 0-45.18 2.82 2.82 0 0 1 2.83 2.82V83.3zm74.66 54.1a2.82 2.82 0 0 0-3.86 1 15.62 15.62 0 0 1-13.5 7.7 15.6 15.6 0 0 1-14.36-9.4 2.82 2.82 0 0 0 2.5-5l-4.7-3.16a2.81 2.81 0 0 0-.88-.53 2.82 2.82 0 0 0-3.58 1.12l-3.42 5.75a2.82 2.82 0 1 0 4.58 3.26 21.24 21.24 0 0 0 19.86 13.6c7.65 0 14.59-4.04 18.37-10.48a2.82 2.82 0 0 0-1-3.87m5.92-14.89a2.82 2.82 0 0 0-3.46.47 21.25 21.25 0 0 0-19.85-13.57 21.27 21.27 0 0 0-18.37 10.5 2.82 2.82 0 0 0 4.87 2.85 15.62 15.62 0 0 1 13.5-7.7 15.6 15.6 0 0 1 14.43 9.57 2.82 2.82 0 0 0-2.7 4.93l5.15 3.46a2.82 2.82 0 0 0 4-.9l3.42-5.74a2.82 2.82 0 0 0-.99-3.87M62.12 221.63H44.78a2.81 2.81 0 0 0-2.43-1.4 2.81 2.81 0 0 0-2.43 1.4H22.6V193.4h8.47a2.82 2.82 0 0 0 2.82-2.83c0-1.36.42-2 1.26-2.41a4.08 4.08 0 0 1 1.57-.4H48c1.36 0 2 .41 2.42 1.25a4.07 4.07 0 0 1 .4 1.56 2.82 2.82 0 0 0 2.83 2.83h8.47v28.23zm2.82-33.88h-8.96a9.19 9.19 0 0 0-.51-1.26c-1.35-2.7-3.9-4.39-7.47-4.39H36.7c-.32 0-.78.04-1.34.13a9.65 9.65 0 0 0-2.74.88 7.6 7.6 0 0 0-3.98 4.64h-8.88a2.82 2.82 0 0 0-2.82 2.82v33.89a2.82 2.82 0 0 0 2.83 2.82h19.76v2.82a2.82 2.82 0 0 0 5.65 0v-2.82h19.76a2.82 2.82 0 0 0 2.83-2.82v-33.89a2.82 2.82 0 0 0-2.83-2.82zm-22.59 25.41a7.06 7.06 0 1 1 0-14.12 7.06 7.06 0 0 1 0 14.12m0-19.76a12.7 12.7 0 1 0 0 25.4 12.7 12.7 0 0 0 0-25.4m0 60.7a2.82 2.82 0 0 0-2.82 2.83v7.06a2.82 2.82 0 0 0 5.65 0v-7.06a2.82 2.82 0 0 0-2.83-2.83m0-16.94a2.82 2.82 0 0 0-2.82 2.83v7.06a2.82 2.82 0 0 0 5.65 0v-7.06a2.82 2.82 0 0 0-2.83-2.83m0 33.89a2.82 2.82 0 0 0-2.82 2.82v7.06a2.82 2.82 0 0 0 5.65 0v-7.06a2.82 2.82 0 0 0-2.83-2.83m152.47 7.06a2.82 2.82 0 1 0 0 5.65 2.82 2.82 0 0 0 0-5.65m11.3 7.77h-22.6v-39.53h22.6v39.53zm2.82-45.18H180.71a2.82 2.82 0 0 0-2.83 2.83v45.17a2.82 2.82 0 0 0 2.83 2.83h28.23a2.82 2.82 0 0 0 2.83-2.83v-45.17a2.82 2.82 0 0 0-2.83-2.83zM86.12 88.22a14.12 14.12 0 1 1 0-28.23 14.12 14.12 0 0 1 0 28.23m2.82-33.68v-3.03h2.82a2.82 2.82 0 0 0 0-5.64H80.47a2.82 2.82 0 0 0 0 5.64h2.82v3.03a19.77 19.77 0 1 0 5.65 0m0 18.4l4.82 4.81a2.82 2.82 0 1 1-4 4l-5.64-5.65a2.82 2.82 0 0 1-.83-2v-7.76a2.82 2.82 0 0 1 5.65 0v6.6zm59.42 32.59l3.3-3.31a2.82 2.82 0 0 0-3.99-4l-3.3 3.31-3.31-3.3a2.82 2.82 0 0 0-4 3.99l3.31 3.3-3.3 3.32a2.82 2.82 0 0 0 3.99 3.99l3.3-3.31 3.31 3.31a2.82 2.82 0 0 0 4-4l-3.31-3.3zM81.88 122.1h33.89v-11.3H81.88v11.3zm-2.82 5.65a2.82 2.82 0 0 1-2.82-2.82v-16.94a2.82 2.82 0 0 1 2.82-2.83h39.53a2.82 2.82 0 0 1 2.82 2.83v16.94a2.82 2.82 0 0 1-2.82 2.82H79.06zm29.65-8.47a2.82 2.82 0 1 0 0-5.65 2.82 2.82 0 0 0 0 5.65m-26.83 28.23h33.89v-11.29H81.88v11.3zm-2.82 5.65a2.82 2.82 0 0 1-2.82-2.82V133.4a2.82 2.82 0 0 1 2.82-2.83h39.53a2.82 2.82 0 0 1 2.82 2.83v16.94a2.82 2.82 0 0 1-2.82 2.82H79.06zm29.65-8.47a2.82 2.82 0 1 0 0-5.65 2.82 2.82 0 0 0 0 5.65m73.4-8.47a2.82 2.82 0 1 0 0 5.65 2.82 2.82 0 0 0 0-5.65m9.89 0a2.82 2.82 0 1 0 0 5.65 2.82 2.82 0 0 0 0-5.65m10.59 0a2.82 2.82 0 1 0 0 5.65 2.82 2.82 0 0 0 0-5.65m7.76 11.3c0 .77-.63 1.4-1.4 1.4h-33.89c-.78 0-1.41-.62-1.41-1.4v-9.18c0-5.85 4.74-10.59 10.59-10.59h15.53c5.84 0 10.58 4.74 10.58 10.59v9.17zm4.86-32.85a2.82 2.82 0 0 0-3.82 1.16l-4.28 8.03a16.16 16.16 0 0 0-7.35-1.76h-15.52a16.16 16.16 0 0 0-7.35 1.76l-4.28-8.03a2.82 2.82 0 1 0-4.98 2.66l4.7 8.82a16.17 16.17 0 0 0-4.33 11.03v9.18a7.06 7.06 0 0 0 7.06 7.05h33.88a7.06 7.06 0 0 0 7.06-7.05v-9.18c0-4.26-1.64-8.14-4.33-11.03l4.7-8.82a2.82 2.82 0 0 0-1.16-3.82zm6.44 178.26a2.82 2.82 0 0 0-5.65 0 2.82 2.82 0 0 1-2.82 2.82 2.82 2.82 0 0 0 0 5.65 8.47 8.47 0 0 0 8.47-8.47m11.3 0a2.82 2.82 0 0 0-5.66 0c0 7.8-6.32 14.12-14.11 14.12a2.82 2.82 0 0 0 0 5.64 19.77 19.77 0 0 0 19.76-19.76m11.3 0a2.82 2.82 0 0 0-5.65 0 25.41 25.41 0 0 1-25.41 25.4 2.82 2.82 0 0 0 0 5.66 31.06 31.06 0 0 0 31.06-31.06m-18.36-94.6h4.24v-11.29h-4.24v11.3zm-2.82 5.66h9.88a2.82 2.82 0 0 0 2.83-2.83v-16.94a2.82 2.82 0 0 0-2.83-2.82h-9.88a2.82 2.82 0 0 0-2.83 2.82v16.94a2.82 2.82 0 0 0 2.83 2.83zm20.47-5.65h4.24V170.1h-4.24v28.24zm-2.82 5.65h9.88a2.82 2.82 0 0 0 2.82-2.83v-33.88a2.82 2.82 0 0 0-2.82-2.82h-9.88a2.82 2.82 0 0 0-2.83 2.82v33.88a2.82 2.82 0 0 0 2.83 2.83zm20.47-5.65h4.23v-23.3h-4.23v23.3zm7.06-28.94h-9.89a2.82 2.82 0 0 0-2.82 2.82v28.94a2.82 2.82 0 0 0 2.82 2.83h9.88a2.82 2.82 0 0 0 2.83-2.83v-28.94a2.82 2.82 0 0 0-2.82-2.82zm0 40.23h-45.18a2.82 2.82 0 0 0 0 5.65h45.18a2.82 2.82 0 0 0 0-5.65m-144 64.94h39.53v-28.23h-39.53v28.23zm42.35-33.88H121.4a2.82 2.82 0 0 0-2.82 2.83v33.88a2.82 2.82 0 0 0 2.82 2.82h45.18a2.82 2.82 0 0 0 2.82-2.82v-33.88a2.82 2.82 0 0 0-2.82-2.83zm-11.3 42.36h-22.58a2.82 2.82 0 0 0 0 5.64h22.58a2.82 2.82 0 0 0 0-5.64M70.6 299.4l-5.65-1.06v-4.01h5.65v5.07zm3.67-53.07l1.82 33.94a2.86 2.86 0 0 0-.55-.06H59.45l1.82-33.88h13zm-12.51 39.53h12.03l-1.88 2.82h-8.27l-1.88-2.82zm20.13-2.98l-2.12-39.53a2.82 2.82 0 0 0-2.82-2.67H58.6a2.82 2.82 0 0 0-2.82 2.67l-2.12 39.53c-.03.61.13 1.21.47 1.72l5.17 7.76v8.32c0 1.36.97 2.53 2.3 2.78l11.3 2.11a2.82 2.82 0 0 0 3.35-2.77v-10.44l5.17-7.76a2.82 2.82 0 0 0 .47-1.72zM64.94 122.1H19.77a2.82 2.82 0 0 0-2.83 2.83v11.3a2.82 2.82 0 0 0 5.65 0v-8.48h39.53V156H19.77a2.82 2.82 0 0 0 0 5.64h6.72l-3.6 7.21a2.82 2.82 0 0 0 5.05 2.53l4.86-9.74h19.8l4.87 9.74a2.82 2.82 0 0 0 5.06-2.53l-3.6-7.2h6.01a2.82 2.82 0 0 0 2.83-2.83v-33.88a2.82 2.82 0 0 0-2.83-2.83m91.52 228.79l-10.47 10.4a2.82 2.82 0 0 1-4.81-2.01V325.4a8.47 8.47 0 0 1 8.47-8.47h33.8a8.55 8.55 0 0 1 8.55 8.55v16.94a8.47 8.47 0 0 1-8.47 8.47h-27.07zm-9.64 1.6l6.48-6.43a2.82 2.82 0 0 1 2-.82h28.23a2.82 2.82 0 0 0 2.82-2.82v-16.95a2.9 2.9 0 0 0-2.9-2.9h-33.8a2.82 2.82 0 0 0-2.83 2.83v27.1zm11.3-18.55a2.82 2.82 0 1 1-5.65 0 2.82 2.82 0 0 1 5.65 0m11.3 0a2.82 2.82 0 1 1-5.66 0 2.82 2.82 0 0 1 5.65 0m8.47 2.83a2.82 2.82 0 1 1 0-5.65 2.82 2.82 0 0 1 0 5.65m-47.3-1.83c0 16.68-16.35 16.59-16.94 16.59H99.53s-2.82 0-2.82-2.8 2.82-2.8 2.82-2.8l14.11-.05c.05 0 11.3.42 11.3-10.94s-11.2-11-11.3-11.01H91.07s-6.35.06-6.35 6.41c0 4.24 2.11 6.36 6.35 6.36H114s1.76.01 1.76-1.76-1.76-1.83-1.76-1.83l-22.94.06s-2.83 0-2.83-2.83 2.83-2.82 2.83-2.82h22.58s7.77-.35 7.77 7.42-7.76 7.4-7.76 7.4h-22.4s-12.2 0-12.2-12c0-11.99 12-11.99 12-11.99h22.6s16.94-.1 16.94 16.59"
      ></path>
    </svg>
  );
};
