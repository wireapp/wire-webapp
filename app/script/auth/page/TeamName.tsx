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
  ArrowIcon,
  COLOR,
  Column,
  Columns,
  Container,
  ContainerXS,
  ErrorMessage,
  Form,
  H1,
  ICON_NAME,
  Input,
  InputSubmitCombo,
  IsMobile,
  Link,
  Muted,
  RoundIconButton,
} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {RouteComponentProps, withRouter} from 'react-router';
import {Link as RRLink} from 'react-router-dom';
import {teamNameStrings} from '../../strings';
import EXTERNAL_ROUTE from '../externalRoute';
import ROOT_ACTIONS from '../module/action/';
import ValidationError from '../module/action/ValidationError';
import {RootState, ThunkDispatch} from '../module/reducer';
import {RegistrationDataState} from '../module/reducer/authReducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import Page from './Page';

interface Props extends React.HTMLAttributes<TeamName>, RouteComponentProps<{}> {}

interface ConnectedProps {
  error: Error;
  teamName: string;
}

interface DispatchProps {
  enterTeamCreationFlow: () => Promise<void>;
  pushAccountRegistrationData: (teamData: Partial<RegistrationDataState>) => Promise<void>;
  resetInviteErrors: () => Promise<void>;
}

interface State {
  enteredTeamName: string;
  error: Error;
  isValidTeamName: boolean;
}

class TeamName extends React.Component<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  private teamNameInput: HTMLInputElement;
  state: State = {
    enteredTeamName: this.props.teamName || '',
    error: null,
    isValidTeamName: !!this.props.teamName,
  };

  componentDidMount() {
    this.props.enterTeamCreationFlow();
  }

  handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    this.teamNameInput.value = this.teamNameInput.value.trim();
    if (!this.teamNameInput.checkValidity()) {
      this.setState({
        error: ValidationError.handleValidationState('name', this.teamNameInput.validity),
        isValidTeamName: false,
      });
    } else {
      Promise.resolve(this.teamNameInput.value)
        .then(teamName => teamName.trim())
        .then(teamName =>
          this.props.pushAccountRegistrationData({
            team: {
              binding: undefined,
              creator: undefined,
              icon: undefined,
              id: undefined,
              name: teamName,
            },
          })
        )
        .then(() => this.props.history.push(ROUTE.CREATE_TEAM_ACCOUNT));
    }
    this.teamNameInput.focus();
  };

  resetErrors = () => {
    this.setState({error: null, isValidTeamName: true});
    this.props.resetInviteErrors();
  };

  render() {
    const {
      intl: {formatMessage: _},
    } = this.props;
    const {enteredTeamName, isValidTeamName, error} = this.state;
    const backArrow = (
      <Link to={ROUTE.INDEX} component={RRLink} data-uie-name="go-register-team">
        <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
      </Link>
    );
    return (
      <Page>
        <IsMobile>
          <div style={{margin: 16}}>{backArrow}</div>
        </IsMobile>
        <Container centerText verticalCenter style={{width: '100%'}}>
          <Columns>
            <IsMobile not>
              <Column style={{display: 'flex'}}>
                <div style={{margin: 'auto'}}>{backArrow}</div>
              </Column>
            </IsMobile>
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
              <ContainerXS
                centerText
                style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
              >
                <div>
                  <H1 center>{_(teamNameStrings.headline)}</H1>
                  <Muted>{_(teamNameStrings.subhead)}</Muted>
                  <Form style={{marginTop: 30}}>
                    <InputSubmitCombo>
                      <Input
                        value={enteredTeamName}
                        innerRef={node => (this.teamNameInput = node)}
                        onChange={event => {
                          this.resetErrors();
                          this.setState({enteredTeamName: event.target.value});
                        }}
                        placeholder={_(teamNameStrings.teamNamePlaceholder)}
                        pattern=".{2,256}"
                        maxLength={256}
                        minLength={2}
                        required
                        autoFocus
                        data-uie-name="enter-team-name"
                      />
                      <RoundIconButton
                        disabled={!enteredTeamName || !isValidTeamName}
                        type="submit"
                        formNoValidate
                        icon={ICON_NAME.ARROW}
                        onClick={this.handleSubmit}
                        data-uie-name="do-next"
                      />
                    </InputSubmitCombo>
                    <ErrorMessage data-uie-name="error-message">
                      {error ? parseValidationErrors(error) : parseError(this.props.error)}
                    </ErrorMessage>
                  </Form>
                </div>
                <div>
                  <Link href={EXTERNAL_ROUTE.WIRE_TEAM_FEATURES} target="_blank" data-uie-name="go-what-is">
                    {_(teamNameStrings.whatIsWireTeamsLink)}
                  </Link>
                </div>
              </ContainerXS>
            </Column>
            <Column />
          </Columns>
        </Container>
      </Page>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      (state: RootState): ConnectedProps => {
        return {
          error: AuthSelector.getError(state),
          teamName: AuthSelector.getAccountTeamName(state),
        };
      },
      (dispatch: ThunkDispatch): DispatchProps => {
        return {
          enterTeamCreationFlow: () => dispatch(ROOT_ACTIONS.authAction.enterTeamCreationFlow()),
          pushAccountRegistrationData: (teamData: Partial<RegistrationDataState>) =>
            dispatch(ROOT_ACTIONS.authAction.pushAccountRegistrationData(teamData)),
          resetInviteErrors: () => dispatch(ROOT_ACTIONS.invitationAction.resetInviteErrors()),
        };
      }
    )(TeamName)
  )
);
