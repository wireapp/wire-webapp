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

import {connect} from 'react-redux';
import {Container, ContainerXS, Columns, Column} from '@wireapp/react-ui-kit/Layout';
import {Form, Input, Button} from '@wireapp/react-ui-kit/Form';
import {H1, Text, Link} from '@wireapp/react-ui-kit/Text';
import {injectIntl} from 'react-intl';
import {withRouter} from 'react-router';
import * as AuthAction from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import React, {Component} from 'react';

class TeamName extends Component {
  pushTeamName = event => {
    event.preventDefault();
    return Promise.resolve(this.teamNameInput.value)
      .then(teamName => teamName.trim())
      .then(teamName => this.props.pushAccountRegistrationData({team: {name: teamName}}))
      .then(() => this.props.history.push('/createaccount'));
  };

  render() {
    return (
      <Container centerText verticalCenter>
        <Columns>
          <Column />
          <Column style={{flexGrow: 2}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
            >
              <div>
                <H1 center>Name your team</H1>
                <Text muted>You can always change it later.</Text>
                <Form>
                  <Input
                    defaultValue={this.props.teamName}
                    innerRef={node => (this.teamNameInput = node)}
                    placeholder={'Team name'}
                  />
                  <Button type="submit" onClick={this.pushTeamName}>
                    Next
                  </Button>
                </Form>
              </div>
              <div>
                <Link href="#" style={{alignSelf: 'flex-end'}}>
                  WHAT IS WIRE FOR TEAMS?
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
