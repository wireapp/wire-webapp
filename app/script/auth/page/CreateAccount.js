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
import {Form, Input, InputBlock, Button, Checkbox} from '@wireapp/react-ui-kit/Form';
import {ArrowIcon} from '@wireapp/react-ui-kit/Icon';
import ROUTES from '../routes';
import {Link as RRLink} from 'react-router-dom';

const CreateAccount = ({history}) => (
  <Container centerText verticalCenter>
    <Columns>
      <Column style={{display: 'flex'}}>
        <div style={{margin: 'auto'}}>
          <Link to={ROUTES.NEWTEAM} data-uie-name="go-register-team" component={RRLink}>
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
            <H1 center>{'Set up your account'}</H1>
            <Form>
              <InputBlock>
                <Input placeholder={'Name'} autoFocus />
                <Input placeholder={'you@yourcompany.com'} placeholderTextTransform="unset" />
                <Input placeholder={'Password (min 8 characters)'} />
              </InputBlock>
              <Checkbox>
                <Small textTransform="uppercase">
                  {'I ACCEPT THE '}
                  <Link href="#" bold fontSize="12px">
                    {'TERMS AND CONDITIONS'}
                  </Link>
                </Small>
              </Checkbox>
              <Button type="submit" onClick={() => history.push(ROUTES.VERIFY)}>
                {'Next'}
              </Button>
            </Form>
          </div>
        </ContainerXS>
      </Column>
      <Column />
    </Columns>
  </Container>
);

export default withRouter(CreateAccount);
