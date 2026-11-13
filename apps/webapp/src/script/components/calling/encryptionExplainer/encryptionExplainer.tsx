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

import type {ReactElement} from 'react';

import {
  encryptionExplainerBodyStyles,
  encryptionExplainerCloseStyles,
  encryptionExplainerHeadStyles,
  encryptionExplainerIconStyles,
  encryptionExplainerLinkStyles,
  encryptionExplainerPanelStyles,
  encryptionExplainerStyles,
  encryptionExplainerTitleStyles,
} from './encryptionExplainer.styles';

import {CloseIcon} from '../../../uiKit/dataDisplay/icon/closeIcon';
import {ShieldIcon} from '../../../uiKit/dataDisplay/icon/shieldIcon';

interface EncryptionExplainerProps {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly closeLabel: string;
  readonly linkLabel: string;
  readonly supportUrl?: string;
  /** "call": centred under the in-call line. "panel": start-aligned under a badge at the start of a column. */
  readonly placement?: 'call' | 'panel';
  readonly onClose: () => void;
}

/**
 * The popover that explains end-to-end encryption, opened from the call security line in a call
 * and from the encrypted badge before joining a meeting. Non-modal, so it is a labelled region.
 * It takes translated text, so it has no dependency on the application context.
 */
export const EncryptionExplainer = ({
  id,
  title,
  body,
  closeLabel,
  linkLabel,
  supportUrl,
  placement = 'call',
  onClose,
}: EncryptionExplainerProps): ReactElement => {
  return (
    <div
      id={id}
      role="region"
      aria-labelledby={`${id}-title`}
      css={placement === 'panel' ? encryptionExplainerPanelStyles : encryptionExplainerStyles}
      data-uie-name="call-security-explainer"
    >
      <div css={encryptionExplainerHeadStyles}>
        <span css={encryptionExplainerIconStyles}>
          <ShieldIcon color="var(--success-color)" width={16} height={16} aria-hidden="true" />
        </span>
        <p id={`${id}-title`} css={encryptionExplainerTitleStyles}>
          {title}
        </p>
        <button
          type="button"
          css={encryptionExplainerCloseStyles}
          aria-label={closeLabel}
          onClick={onClose}
          data-uie-name="call-security-explainer-close"
        >
          <CloseIcon color="var(--foreground-fade-56)" width={12} height={12} aria-hidden="true" />
        </button>
      </div>
      <p css={encryptionExplainerBodyStyles}>{body}</p>
      {Boolean(supportUrl) && (
        <a
          css={encryptionExplainerLinkStyles}
          href={supportUrl}
          rel="nofollow noopener noreferrer"
          target="_blank"
          data-uie-name="call-security-explainer-link"
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
};
