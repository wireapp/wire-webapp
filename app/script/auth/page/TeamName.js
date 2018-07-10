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
  COLOR,
  ArrowIcon,
  H1,
  Text,
  Link,
  Container,
  ContainerXS,
  Columns,
  Column,
  Form,
  ICON_NAME,
  InputSubmitCombo,
  Input,
  RoundIconButton,
  ErrorMessage,
} from '@wireapp/react-ui-kit';
import {ROUTE} from '../route';
import {isDesktopApp, isMacOS} from '../Runtime';
import EXTERNAL_ROUTE from '../externalRoute';
import {Link as RRLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {teamNameStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import {withRouter} from 'react-router';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {resetError} from '../module/action/creator/InviteActionCreator';
import * as AuthAction from '../module/action/AuthAction';
import {enterTeamCreationFlow} from '../module/action/creator/AuthActionCreator';
import * as AuthSelector from '../module/selector/AuthSelector';
import ValidationError from '../module/action/ValidationError';
import React, {Component} from 'react';
import Page from './Page';

class TeamName extends Component {
  state = {
    enteredTeamName: this.props.teamName || '',
    error: null,
    isValidTeamName: !!this.props.teamName,
  };

  componentDidMount() {
    this.props.enterTeamCreationFlow();
  }

  handleSubmit = event => {
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
        .then(teamName => this.props.pushAccountRegistrationData({team: {name: teamName}}))
        .then(() => this.props.history.push(ROUTE.CREATE_TEAM_ACCOUNT));
    }
    this.teamNameInput.focus();
  };

  resetErrors = () => {
    this.setState({error: null, isValidTeamName: true});
    this.props.resetError();
  };

  render() {
    const {
      intl: {formatMessage: _},
    } = this.props;
    const {enteredTeamName, isValidTeamName, error} = this.state;
    return (
      <Page>
        <Container centerText verticalCenter style={{width: '100%'}}>
          <Columns>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>
                <Link to={ROUTE.INDEX} component={RRLink} data-uie-name="go-register-team">
                  <ArrowIcon direction="left" color={COLOR.GRAY} />
                </Link>
              </div>
            </Column>
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
              <ContainerXS
                centerText
                style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
              >
                <div>
                  <H1 center>{_(teamNameStrings.headline)}</H1>
                  <Text>{_(teamNameStrings.subhead)}</Text>
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
                        maxLength="256"
                        minLength="2"
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
                {!(isDesktopApp() && isMacOS()) && (
                  <div>
                    <Link href={EXTERNAL_ROUTE.WIRE_TEAM_FEATURES} target="_blank" data-uie-name="go-what-is">
                      {_(teamNameStrings.whatIsWireTeamsLink)}
                    </Link>
                  </div>
                )}
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
      state => ({
        error: AuthSelector.getError(state),
        teamName: AuthSelector.getAccountTeamName(state),
      }),
      {
        ...AuthAction,
        enterTeamCreationFlow,
        resetError,
      }
    )(TeamName)
  )
);
