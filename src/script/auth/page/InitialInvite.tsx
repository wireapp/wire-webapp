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
  ButtonLink,
  COLOR,
  CheckIcon,
  ContainerXS,
  ErrorMessage,
  Form,
  H1,
  ICON_NAME,
  Input,
  InputSubmitCombo,
  Link,
  Muted,
  RoundIconButton,
  Text,
} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {inviteStrings} from '../../strings';
import {externalRoute as EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as InviteSelector from '../module/selector/InviteSelector';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {pathWithParams} from '../util/urlUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

interface State {
  enteredEmail: string;
  error: Error;
}

class InitialInvite extends React.PureComponent<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  emailInput: React.RefObject<any> = React.createRef();
  state: State = {
    enteredEmail: '',
    error: null,
  };

  componentDidMount(): void {
    this.props.fetchSelf();
  }

  onInviteDone = (): void => window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP));

  renderEmail = (email: string): JSX.Element => (
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

  handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    this.emailInput.current.value = this.emailInput.current.value.trim();
    if (!this.emailInput.current.checkValidity()) {
      this.setState({error: ValidationError.handleValidationState('email', this.emailInput.current.validity)});
    } else {
      this.props.invite({email: this.emailInput.current.value}).catch(error => {
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
      });
      this.setState({enteredEmail: ''});
      this.emailInput.current.value = '';
    }
    this.emailInput.current.focus();
  };

  resetErrors = (): void => {
    this.setState({error: null});
    this.props.resetInviteErrors();
  };

  render() {
    const {
      invites,
      isFetching,
      error,
      intl: {formatMessage: _},
    } = this.props;
    const {enteredEmail} = this.state;
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
            {invites.map(({email}) => this.renderEmail(email))}
            <Form onSubmit={this.handleSubmit}>
              <InputSubmitCombo>
                <Input
                  name="email"
                  placeholder={_(inviteStrings.emailPlaceholder)}
                  type="email"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    this.resetErrors();
                    this.setState({enteredEmail: event.target.value});
                  }}
                  ref={this.emailInput}
                  autoFocus
                  data-uie-name="enter-invite-email"
                />
                <RoundIconButton
                  disabled={isFetching || !enteredEmail}
                  type="submit"
                  icon={ICON_NAME.PLANE}
                  data-uie-name="do-send-invite"
                  formNoValidate
                />
              </InputSubmitCombo>
            </Form>
            <ErrorMessage data-uie-name="error-message">
              {this.state.error ? parseValidationErrors(this.state.error) : parseError(error)}
            </ErrorMessage>
          </div>
          <div>
            {invites.length ? (
              <ButtonLink style={{margin: '0 auto -16px'}} onClick={this.onInviteDone} data-uie-name="do-next">
                {_(inviteStrings.nextButton)}
              </ButtonLink>
            ) : (
              <Link onClick={this.onInviteDone} data-uie-name="do-skip">
                {_(inviteStrings.skipForNow)}
              </Link>
            )}
          </div>
        </ContainerXS>
      </Page>
    );
  }
}

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  error: InviteSelector.getError(state),
  invites: InviteSelector.getInvites(state),
  isFetching: InviteSelector.isFetching(state),
  language: LanguageSelector.getLanguage(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      fetchSelf: ROOT_ACTIONS.selfAction.fetchSelf,
      invite: ROOT_ACTIONS.invitationAction.invite,
      resetInviteErrors: ROOT_ACTIONS.invitationAction.resetInviteErrors,
    },
    dispatch,
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(injectIntl(InitialInvite));
