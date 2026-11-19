/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {FormEvent, useState, type FunctionComponent} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {learnMoreLinkStyles, learnMoreLinkTextStyles} from './joinGuestLinkPasswordModal.styles';

import {Config} from '../../Config';
import {useApplicationContext} from '../../page/rootProvider';
import {COLOR} from '../../uiKit/identity/colors/colors';
import {Button} from '../../uiKit/inputs/button/button';
import {ErrorMessage} from '../../uiKit/inputs/errorMessage/errorMessage';
import {Form} from '../../uiKit/inputs/form/form';
import {Input} from '../../uiKit/inputs/input/input';
import {Container} from '../../uiKit/layout/container/container';
import {Modal} from '../../uiKit/surface/modal/modal';
import {H2} from '../../uiKit/typography/heading/heading';
import {Link} from '../../uiKit/typography/link/link';
import {Text} from '../../uiKit/typography/text/text';
import {getJoinLink, isJoinLinkPasswordError, JOIN_LINK_KIND} from '../util/joinLink';

export interface JoinGuestLinkPasswordModalProps {
  onSubmitPassword: (password: string) => void;
  isLoading?: boolean;
  conversationName?: string;
  error: (Error & {label?: string; code?: number; message?: string}) | null;
  onClose: () => void;
}

const JoinGuestLinkPasswordModal: FunctionComponent<JoinGuestLinkPasswordModalProps> = ({
  error,
  onClose,
  isLoading,
  conversationName,
  onSubmitPassword,
}: JoinGuestLinkPasswordModalProps) => {
  const {translate} = useApplicationContext();
  const [passwordValue, setPasswordValue] = useState<string>('');
  const [submittedError, setSubmittedError] = useState<{error: JoinGuestLinkPasswordModalProps['error']} | null>(null);
  const isMeeting = getJoinLink().kind === JOIN_LINK_KIND.MEETING;
  const conversationHeadline = isNonEmptyString(conversationName)
    ? translate('guestLinkPasswordModal.headline', {conversationName})
    : translate('guestLinkPasswordModal.headlineDefault');

  const onSubmit = (event: FormEvent<HTMLFormElement | HTMLButtonElement>): void => {
    event.preventDefault();
    setSubmittedError({error});
    onSubmitPassword(passwordValue);
  };

  const Error: FunctionComponent = () => {
    if (error === null || (isMeeting && (submittedError === null || submittedError.error === error))) {
      return null;
    }
    if (!isMeeting && error.code !== HTTP_STATUS.FORBIDDEN && error.code !== HTTP_STATUS.BAD_REQUEST) {
      return null;
    }
    let errorKey: 'guestLinkPasswordModal.passwordIncorrect' | 'meetingJoin.passwordFailed' | 'meetingJoin.joinFailed' =
      'guestLinkPasswordModal.passwordIncorrect';
    if (isMeeting) {
      errorKey = isJoinLinkPasswordError(error) ? 'meetingJoin.passwordFailed' : 'meetingJoin.joinFailed';
    }
    return <ErrorMessage>{translate(errorKey)}</ErrorMessage>;
  };

  return (
    <Modal onClose={onClose}>
      <Container style={{maxWidth: '400px'}}>
        <H2 style={{whiteSpace: 'break-spaces', fontWeight: 500, marginTop: '10px', textAlign: 'center'}}>
          {isMeeting ? translate('meetingJoin.passwordHeadline') : conversationHeadline}
        </H2>
        <Text block fontSize="var(--font-size-base)" style={{marginBottom: 24}}>
          {translate(isMeeting ? 'meetingJoin.passwordDescription' : 'guestLinkPasswordModal.description')}
        </Text>
        <Form
          name="guest-password-join-form"
          data-uie-name="guest-password-join-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            onSubmit(event);
          }}
          autoComplete="off"
        >
          <Input
            error={<Error />}
            data-uie-name="guest-link-join-password-input"
            name="guest-join-password"
            required
            placeholder={translate(
              isMeeting ? 'meetingJoin.passwordInputLabel' : 'guestLinkPasswordModal.passwordInputLabel',
            )}
            label={translate(
              isMeeting ? 'meetingJoin.passwordInputLabel' : 'guestLinkPasswordModal.passwordInputLabel',
            )}
            id="guest_link_join_password"
            className="modal__input"
            type="password"
            showTogglePasswordLabel={translate('showTogglePasswordLabel')}
            hideTogglePasswordLabel={translate('hideTogglePasswordLabel')}
            autoComplete="off"
            value={passwordValue}
            onChange={event => {
              setPasswordValue(event.currentTarget.value);
            }}
          />
        </Form>
        <Link
          href={Config.getConfig().URL.SUPPORT.LEARN_MORE_ABOUT_GUEST_LINKS}
          target="_blank"
          css={learnMoreLinkStyles}
        >
          <Text color={COLOR.BLUE} css={learnMoreLinkTextStyles}>
            {translate('guestLinkPasswordModal.learnMoreLink')}
          </Text>
        </Link>
        <Button
          showLoading={isLoading}
          block
          type="button"
          disabled={!isNonEmptyString(passwordValue)}
          onClick={(event: FormEvent<HTMLButtonElement>) => {
            onSubmit(event);
          }}
          data-uie-name="guest-link-join-submit-button"
        >
          {translate(isMeeting ? 'meetingJoin.joinHeadline' : 'guestLinkPasswordModal.joinConversation')}
        </Button>
      </Container>
    </Modal>
  );
};

export {JoinGuestLinkPasswordModal};
