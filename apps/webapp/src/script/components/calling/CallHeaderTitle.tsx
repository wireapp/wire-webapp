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

import {type ReactElement, useEffect, useId, useRef, useState} from 'react';

import {isUndefined} from '@sindresorhus/is';

import {
  callHeaderPopoverCloseStyles,
  callHeaderPopoverFooterStyles,
  callHeaderPopoverHeaderStyles,
  callHeaderPopoverStyles,
  callHeaderTitleButtonStyles,
  callHeaderTitleRootStyles,
} from './CallHeaderTitle.styles';

import type {QualifiedId} from '../../apiClient/user';
import {useApplicationContext} from '../../page/rootProvider';
import {CloseIcon} from '../../uiKit/dataDisplay/icon/closeIcon';
import {TriangleIcon} from '../../uiKit/dataDisplay/icon/triangleIcon';
import {isEscapeKey} from '../../util/keyboardUtil';
import {matchQualifiedIds} from '../../util/qualifiedId';
import {MeetingLink} from '../meeting/meetingLink/meetingLink';
import {useMeetingStore} from '../meeting/meetingStore/meetingStoreProvider';

type CallHeaderTitleProps = {
  conversationId: QualifiedId;
  title: string;
  closeSignal: number;
  onOpen: () => void;
};

export const CallHeaderTitle = ({conversationId, title, closeSignal, onOpen}: CallHeaderTitleProps): ReactElement => {
  const {translate} = useApplicationContext();
  const meeting = useMeetingStore(state => {
    return state.meetingSeries.find(series => {
      return matchQualifiedIds(series.qualified_conversation, conversationId);
    });
  });
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const link = meeting?.link;
  const hasLink = !isUndefined(link) && link.length > 0;

  useEffect(() => {
    setIsOpen(false);
  }, [closeSignal, hasLink]);

  useEffect(() => {
    const ownerDocument = rootRef.current?.ownerDocument;
    if (!isOpen || isUndefined(ownerDocument)) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEscapeKey(event)) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onMouseDown = (event: MouseEvent): void => {
      if (rootRef.current !== null && !event.composedPath().includes(rootRef.current)) {
        setIsOpen(false);
      }
    };
    ownerDocument.addEventListener('keydown', onKeyDown);
    ownerDocument.addEventListener('mousedown', onMouseDown);
    return () => {
      ownerDocument.removeEventListener('keydown', onKeyDown);
      ownerDocument.removeEventListener('mousedown', onMouseDown);
    };
  }, [isOpen]);

  if (!hasLink) {
    return <h2 className="video-remote-title">{title}</h2>;
  }

  return (
    <div ref={rootRef} css={callHeaderTitleRootStyles}>
      <button
        ref={triggerRef}
        type="button"
        css={callHeaderTitleButtonStyles}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={() => {
          if (!isOpen) {
            onOpen();
          }
          setIsOpen(!isOpen);
        }}
        data-uie-name="call-meeting-link-trigger"
      >
        <h2 className="video-remote-title">{title}</h2>
        <TriangleIcon direction={isOpen ? 'up' : 'down'} aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          id={popoverId}
          role="region"
          aria-label={translate('meetings.meetingLink.title')}
          css={callHeaderPopoverStyles}
          data-uie-name="call-meeting-link-popover"
        >
          <div css={callHeaderPopoverHeaderStyles}>
            <strong>{translate('meetings.meetingLink.title')}</strong>
            <button
              type="button"
              css={callHeaderPopoverCloseStyles}
              aria-label={translate('meetings.meetingLink.close')}
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              data-uie-name="call-meeting-link-close"
            >
              <CloseIcon color="var(--foreground-fade-56)" width={12} height={12} aria-hidden="true" />
            </button>
          </div>
          <MeetingLink
            link={link}
            hasPassword={meeting?.has_password === true}
            translate={translate}
            footerStyles={callHeaderPopoverFooterStyles}
            descriptionId={`${popoverId}-description`}
          />
        </div>
      )}
    </div>
  );
};
