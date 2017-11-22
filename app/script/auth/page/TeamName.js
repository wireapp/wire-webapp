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

import React from 'react';
import {withRouter} from 'react-router';
import {Container, ContainerXS, Columns, Column} from '@wireapp/react-ui-kit/Layout';
import {H1, Text, Link} from '@wireapp/react-ui-kit/Text';
import {Form, InputSubmitCombo, Input, RoundIconButton} from '@wireapp/react-ui-kit/Form';
import {ArrowIcon} from '@wireapp/react-ui-kit/Icon';
import ROUTES from '../routes';
import {Link as RRLink} from 'react-router-dom';

const TeamName = ({history}) => (
  <Container centerText verticalCenter>
    <Columns>
      <Column style={{display: 'flex'}}>
        <div style={{margin: 'auto'}}>
          <Link to={ROUTES.INDEX} data-uie-name="go-register-team" component={RRLink}>
            <ArrowIcon direction="left" />
          </Link>
        </div>
      </Column>
      <Column style={{flexGrow: 2}}>
        <ContainerXS
          centerText
          style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
        >
          <div>
            <H1 center>Name your team</H1>
            <Text muted>You can always change it later.</Text>
            <Form>
              <InputSubmitCombo>
                <Input placeholder={'Team name'.toUpperCase()} />
                <RoundIconButton type="submit" onClick={() => history.push('/createaccount')} />
              </InputSubmitCombo>
            </Form>
          </div>
          <div>
            <Link href="#" fontSize="12px" bold style={{alignSelf: 'flex-end'}}>
              WHAT IS WIRE FOR TEAMS?
            </Link>
          </div>
        </ContainerXS>
      </Column>
      <Column />
    </Columns>
  </Container>
);

export default withRouter(TeamName);
