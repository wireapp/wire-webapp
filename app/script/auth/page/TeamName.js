/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import {Container, ContainerXS, Columns, Column} from '@wireapp/react-ui-kit/Layout';
import {Form, InputSubmitCombo, Input, RoundIconButton, ErrorMessage} from '@wireapp/react-ui-kit/Form';
import {H1, Text, Link} from '@wireapp/react-ui-kit/Text';
import {ArrowIcon} from '@wireapp/react-ui-kit/Icon';
import ROUTE from '../route';
import {Link as RRLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {COLOR} from '@wireapp/react-ui-kit/Identity';
import {teamNameStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import {withRouter} from 'react-router';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {resetError} from '../module/action/creator/InviteActionCreator';
import * as AuthAction from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import ValidationError from '../module/action/ValidationError';
import React, {Component} from 'react';

const wireTeamLink = `${ROUTE.WIRE_ROOT}/create-team/#features`;

class TeamName extends Component {
  state = {
    enteredTeamName: this.props.teamName,
    error: null,
    isValidTeamName: false,
  };

  handleSubmit = event => {
    event.preventDefault();
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
    const {intl: {formatMessage: _}} = this.props;
    const {enteredTeamName, isValidTeamName, error} = this.state;
    return (
      <Container centerText verticalCenter style={{width: '100%'}}>
        <Columns>
          <Column style={{display: 'flex'}}>
            <div style={{margin: 'auto'}}>
              <Link to={ROUTE.INDEX} data-uie-name="go-register-team" component={RRLink}>
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
                      defaultValue={enteredTeamName}
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
                <Link href={wireTeamLink} target="_blank" data-uie-name="go-what-is">
                  {_(teamNameStrings.whatIsWireTeamsLink)}
                </Link>
              </div>
            </ContainerXS>
          </Column>
          <Column />
        </Columns>
      </Container>
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
      {...AuthAction, resetError}
    )(TeamName)
  )
);
