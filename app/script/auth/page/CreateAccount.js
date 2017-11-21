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
              <Input placeholder={'Name'.toUpperCase()} />
              <Input placeholder={'you@yourcompany.com'} />
              <Input placeholder={'Password (min 8 characters)'.toUpperCase()} />
              <Checkbox>
                <Small textTransform="uppercase">
                  {'I ACCEPT THE '}
                  <Link href="#">{'TERMS AND CONDITIONS'}</Link>
                </Small>
              </Checkbox>
              <Button type="submit" onClick={() => history.push('/')}>
                {'Next'}
              </Button>
            </Form>
          </div>
          <div>
            <Link href="#" style={{alignSelf: 'flex-end'}}>
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
