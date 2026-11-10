/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {ReactNode} from 'react';

import * as Icon from '../icon';

interface SelfPreviewControlsProps {
  isMuted: boolean;
  isHandRaised: boolean;
  restoreLabel: string;
  onRestore: () => void;
}

const SelfPreviewControls = ({isMuted, isHandRaised, restoreLabel, onRestore}: SelfPreviewControlsProps): ReactNode => {
  return (
    <div
      data-uie-name="self-preview-minimized-controls"
      css={{
        alignItems: 'center',
        backgroundColor: 'var(--gray-95)',
        borderRadius: 20,
        boxSizing: 'border-box',
        color: 'var(--white)',
        display: 'flex',
        gap: 6,
        height: 40,
        justifyContent: 'center',
        padding: '4px 8px',
        width: 'fit-content',
      }}
    >
      {isMuted && (
        <span
          aria-hidden="true"
          data-uie-name="self-preview-muted-indicator"
          css={{alignItems: 'center', backgroundColor: 'transparent', display: 'flex'}}
        >
          <Icon.MicOffIcon css={{'&& path': {fill: 'currentColor'}}} />
        </span>
      )}
      {isHandRaised && (
        <span
          aria-hidden="true"
          data-uie-name="self-preview-hand-raised-indicator"
          css={{backgroundColor: 'transparent', filter: 'grayscale(1) brightness(2)', fontSize: 14, lineHeight: 1}}
        >
          ✋
        </span>
      )}
      <button
        type="button"
        aria-label={restoreLabel}
        title={restoreLabel}
        onClick={event => {
          event.stopPropagation();
          onRestore();
        }}
        data-uie-name="restore-self-video-preview"
        css={{
          alignItems: 'center',
          backgroundColor: 'transparent',
          border: 0,
          borderRadius: 4,
          color: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          height: 32,
          justifyContent: 'flex-start',
          padding: 0,
          width: 32,
          transition: 'opacity 120ms ease-out',
          '&:hover': {opacity: 0.8},
          '&:focus-visible': {
            outline: '2px solid var(--white)',
            outlineOffset: 2,
          },
        }}
      >
        <Icon.FullscreenIcon aria-hidden="true" css={{'&& path': {fill: 'currentColor'}}} />
      </button>
    </div>
  );
};

export {SelfPreviewControls};
