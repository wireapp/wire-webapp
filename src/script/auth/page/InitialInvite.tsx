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

import React, {useState} from 'react';

import {BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';

import {
  Button,
  COLOR,
  CheckIcon,
  ContainerXS,
  Form,
  H1,
  Input,
  InputSubmitCombo,
  Link,
  Muted,
  PlaneIcon,
  RoundIconButton,
  Text,
  InputBlock,
} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';

import {Exception} from '../component/Exception';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as InviteSelector from '../module/selector/InviteSelector';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import {QUERY_KEY} from '../route';
import {pathWithParams} from '../util/urlUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const InitialInviteComponent = ({
  invites,
  isFetching,
  inviteError,
  resetInviteErrors,
  invite,
  isTeamFlow,
  removeLocalStorage,
}: Props & ConnectedProps & DispatchProps) => {
  const emailInput = React.useRef<HTMLInputElement>();
  const [enteredEmail, setEnteredEmail] = useState('');
  const [error, setError] = useState(null);

  const onInviteDone = async () => {
    // Remove local storage item for 2FA logout if token expires.
    removeLocalStorage(QUERY_KEY.JOIN_EXPIRES);
    window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP));
  };

  const renderEmail = (email: string): JSX.Element => (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        margin: '17px auto',
        padding: '0 24px 0 20px',
      }}
      key={email}
    >
      <Text fontSize="14px" data-uie-name="item-pending-email">
        {email}
      </Text>
      <CheckIcon color={COLOR.TEXT} />
    </div>
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    emailInput.current.value = emailInput.current.value.trim();
    emailInput.current.focus();
    if (!emailInput.current.checkValidity()) {
      setError(ValidationError.handleValidationState('email', emailInput.current.validity));
    } else {
      try {
        await invite({email: emailInput.current.value});
        setEnteredEmail('');
        emailInput.current.value = '';
      } catch (error) {
        if (error.label) {
          switch (error.label) {
            case BackendErrorLabel.INVITE_EMAIL_EXISTS:
            case SyntheticErrorLabel.ALREADY_INVITED: {
              return;
            }
            default: {
              const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
                error.label.endsWith(errorType),
              );
              if (!isValidationError) {
                throw error;
              }
            }
          }
        } else {
          throw error;
        }
      }
    }
  };

  const resetErrors = (): void => {
    setError(null);
    resetInviteErrors();
  };

  if (!isTeamFlow) {
    onInviteDone();
    return null;
  }

  const onEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetErrors();
    setEnteredEmail(event.target.value);
  };

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
      >
        <div>
          <H1 center>{t('invite.headline')}</H1>
          <Muted>{t('invite.subhead')}</Muted>
        </div>
        <div style={{margin: '18px 0', minHeight: 220}}>
          {invites.map(({email}) => renderEmail(email))}
          <Form onSubmit={handleSubmit}>
            <InputBlock>
              <InputSubmitCombo>
                <Input
                  id="enter-invite-email"
                  name="email"
                  placeholder={t('invite.emailPlaceholder')}
                  type="email"
                  onChange={onEmailChange}
                  // Note: Curser issues when using controlled input
                  // value={enteredEmail}
                  ref={emailInput}
                  data-uie-name="enter-invite-email"
                />
                <RoundIconButton
                  disabled={isFetching || !enteredEmail}
                  type="submit"
                  data-uie-name="do-send-invite"
                  formNoValidate
                >
                  <PlaneIcon />
                </RoundIconButton>
              </InputSubmitCombo>
            </InputBlock>
          </Form>
          <Exception errors={[error, inviteError]} />
        </div>
        <div>
          {invites.length ? (
            <Button type="button" onClick={onInviteDone} data-uie-name="do-next">
              {t('invite.nextButton')}
            </Button>
          ) : (
            <Link onClick={onInviteDone} data-uie-name="do-skip">
              {t('invite.skipForNow')}
            </Link>
          )}
        </div>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  inviteError: InviteSelector.getError(state),
  invites: InviteSelector.getInvites(state),
  isFetching: InviteSelector.isFetching(state),
  isTeamFlow: AuthSelector.isTeamFlow(state),
  language: LanguageSelector.getLanguage(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      invite: ROOT_ACTIONS.invitationAction.invite,
      removeLocalStorage: ROOT_ACTIONS.localStorageAction.deleteLocalStorage,
      resetInviteErrors: ROOT_ACTIONS.invitationAction.resetInviteErrors,
    },
    dispatch,
  );

const InitialInvite = connect(mapStateToProps, mapDispatchToProps)(InitialInviteComponent);

export {InitialInvite};
