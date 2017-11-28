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
import {Form, InputSubmitCombo, Input, RoundIconButton} from '@wireapp/react-ui-kit/Form';
import {H1, Text, Link} from '@wireapp/react-ui-kit/Text';
import {ArrowIcon} from '@wireapp/react-ui-kit/Icon';
import ROUTE from '../route';
import {Link as RRLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {COLOR} from '@wireapp/react-ui-kit/Identity';
import {teamNameStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import {withRouter} from 'react-router';
import {onEnvironment} from '../Environment';
import * as AuthAction from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import React, {Component} from 'react';

const stagingWireTeamLink = 'https://wire-website-staging.zinfra.io/create-team/';

const wireTeamLink = onEnvironment(stagingWireTeamLink, stagingWireTeamLink, 'https://wire.com/create-team/');

class TeamName extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isValidTeamName: false,
    };
  }

  componentDidMount() {
    this.setState({isValidTeamName: this.teamNameInput.checkValidity()});
  }

  pushTeamName = event => {
    event.preventDefault();
    return Promise.resolve(this.teamNameInput.value)
      .then(teamName => teamName.trim())
      .then(teamName => this.props.pushAccountRegistrationData({team: {name: teamName}}))
      .then(() => this.props.history.push(ROUTE.CREATE_ACCOUNT));
  };

  render() {
    const {teamName, intl: {formatMessage: _}} = this.props;
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
                      defaultValue={teamName}
                      innerRef={node => (this.teamNameInput = node)}
                      onChange={() => this.setState({isValidTeamName: this.teamNameInput.checkValidity()})}
                      placeholder={_(teamNameStrings.teamNamePlaceholder)}
                      pattern=".{2,256}"
                      maxLength="256"
                      minLength="2"
                      required
                      autoFocus
                      data-uie-name="enter-team-name"
                    />
                    <RoundIconButton
                      disabled={!this.state.isValidTeamName}
                      type="submit"
                      onClick={this.pushTeamName}
                      data-uie-name="do-next"
                    />
                  </InputSubmitCombo>
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
        teamName: AuthSelector.getAccountTeamName(state),
      }),
      {...AuthAction}
    )(TeamName)
  )
);
