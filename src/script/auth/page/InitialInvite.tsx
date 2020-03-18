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
} from '@wireapp/react-ui-kit';
import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {inviteStrings} from '../../strings';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as InviteSelector from '../module/selector/InviteSelector';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import {pathWithParams} from '../util/urlUtil';
import Page from './Page';
import Exception from '../component/Exception';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const InitialInvite = ({
  invites,
  isFetching,
  inviteError,
  resetInviteErrors,
  invite,
  isTeamFlow,
  doFlushDatabase,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const emailInput = React.useRef<HTMLInputElement>();
  const [enteredEmail, setEnteredEmail] = useState('');
  const [error, setError] = useState(null);

  const onInviteDone = async () => {
    await doFlushDatabase();
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
            case BackendError.LABEL.EMAIL_EXISTS:
            case BackendError.LABEL.ALREADY_INVITED: {
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

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
      >
        <div>
          <H1 center>{_(inviteStrings.headline)}</H1>
          <Muted>{_(inviteStrings.subhead)}</Muted>
        </div>
        <div style={{margin: '18px 0', minHeight: 220}}>
          {invites.map(({email}) => renderEmail(email))}
          <Form onSubmit={handleSubmit}>
            <InputSubmitCombo>
              <Input
                name="email"
                placeholder={_(inviteStrings.emailPlaceholder)}
                type="email"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  resetErrors();
                  setEnteredEmail(event.target.value);
                }}
                // Note: Curser issues when using controlled input
                // value={enteredEmail}
                ref={emailInput}
                autoFocus
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
          </Form>
          <Exception errors={[error, inviteError]} />
        </div>
        <div>
          {invites.length ? (
            <Button onClick={onInviteDone} data-uie-name="do-next">
              {_(inviteStrings.nextButton)}
            </Button>
          ) : (
            <Link onClick={onInviteDone} data-uie-name="do-skip">
              {_(inviteStrings.skipForNow)}
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
      doFlushDatabase: ROOT_ACTIONS.authAction.doFlushDatabase,
      invite: ROOT_ACTIONS.invitationAction.invite,
      resetInviteErrors: ROOT_ACTIONS.invitationAction.resetInviteErrors,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(InitialInvite);
