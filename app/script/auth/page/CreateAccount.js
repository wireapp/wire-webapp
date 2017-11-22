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
import {H1, Link, Small} from '@wireapp/react-ui-kit/Text';
import {Form, Input, Button, Checkbox} from '@wireapp/react-ui-kit/Form';

const CreateAccount = ({history}) => (
  <Container centerText verticalCenter>
    <Columns>
      <Column />
      <Column style={{flexGrow: 2}}>
        <ContainerXS
          centerText
          style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
        >
          <div>
            <H1 center>{'Set up your account'}</H1>
            <Form>
              <Input data-uie-name="enter-name" placeholder={'Name'.toUpperCase()} autoFocus />
              <Input data-uie-name="enter-email" type="email" placeholder={'you@yourcompany.com'} />
              <Input
                data-uie-name="enter-password"
                type="password"
                placeholder={'Password (min 8 characters)'.toUpperCase()}
              />
              <Checkbox data-uie-name="do-terms">
                <Small textTransform="uppercase">
                  {'I ACCEPT THE '}
                  <Link data-uie-name="go-terms" href="#">
                    {'TERMS AND CONDITIONS'}
                  </Link>
                </Small>
              </Checkbox>
              <Button data-uie-name="do-next" type="submit" onClick={() => history.push('/')}>
                {'Next'}
              </Button>
            </Form>
          </div>
          <div>
            <Link data-uie-name="go-what-is" href="#" style={{alignSelf: 'flex-end'}}>
              {'WHAT IS WIRE FOR TEAMS?'}
            </Link>
          </div>
        </ContainerXS>
      </Column>
      <Column />
    </Columns>
  </Container>
);

export default withRouter(CreateAccount);
