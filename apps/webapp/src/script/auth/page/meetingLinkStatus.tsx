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

import type {FunctionComponent} from 'react';

import {isUndefined} from '@sindresorhus/is';
import {StatusCodes} from 'http-status-codes';

import {statusContentCss} from './meetingLinkGate.styles';

import {BackendErrorLabel} from '../../apiClient/http/backendErrorLabel';
import {useApplicationContext} from '../../page/rootProvider';
import {Loading} from '../../uiKit/dataDisplay/loading/loading';
import {Button, ButtonVariant} from '../../uiKit/inputs/button/button';
import {ContainerXS} from '../../uiKit/layout/container/container';
import {H2} from '../../uiKit/typography/heading/heading';
import {Text} from '../../uiKit/typography/text/text';
import {isBackendError, isErrorWithCode} from '../../util/typePredicateUtil';
import {WirelessContainer} from '../component/wirelessContainer';

export type LinkError = Error & {label?: string; code?: number};

const meetingLinkMessages = {
  failed: {headline: 'meetingJoin.failedHeadline', description: 'meetingJoin.failedDescription'},
  invalid: {headline: 'meetingJoin.invalidHeadline', description: 'meetingJoin.invalidDescription'},
  unsupported: {headline: 'meetingJoin.unsupportedHeadline', description: 'meetingJoin.unsupportedDescription'},
} as const;

const isUnsupported = (label?: string): boolean => {
  return label === 'meeting-api-unsupported' || label === 'id-feature-error';
};

export const isMeetingLinkUnavailable = (error: unknown): boolean => {
  return (
    (isBackendError(error) && (isUnsupported(error.label) || error.label === BackendErrorLabel.MEETING_NOT_FOUND)) ||
    (isErrorWithCode(error) && error.code === StatusCodes.NOT_FOUND)
  );
};

export const MeetingLinkStatus: FunctionComponent<{
  error?: LinkError;
  retry?: () => void;
  status?: keyof typeof meetingLinkMessages;
}> = ({error, retry, status}) => {
  const {translate} = useApplicationContext();
  let message: keyof typeof meetingLinkMessages = status ?? 'failed';
  if (isUndefined(status) && isUnsupported(error?.label)) {
    message = 'unsupported';
  } else if (isUndefined(status) && isMeetingLinkUnavailable(error)) {
    message = 'invalid';
  }

  return (
    <WirelessContainer>
      <ContainerXS verticalCenter>
        <div css={statusContentCss}>
          {isUndefined(error) && isUndefined(status) ? (
            <Loading />
          ) : (
            <>
              <H2 center data-uie-name="status-invalid-headline">
                {translate(meetingLinkMessages[message].headline)}
              </H2>
              <Text center block>
                {translate(meetingLinkMessages[message].description)}
              </Text>
              {!isUndefined(retry) && (
                <Button variant={ButtonVariant.SECONDARY} onClick={retry}>
                  {translate('meetingJoin.retry')}
                </Button>
              )}
            </>
          )}
        </div>
      </ContainerXS>
    </WirelessContainer>
  );
};
