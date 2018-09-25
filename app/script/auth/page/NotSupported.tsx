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

import * as React from 'react';
import {Text, Logo, ContainerXS} from '@wireapp/react-ui-kit';
import {connect} from 'react-redux';
import {indexStrings} from '../../strings';
import {injectIntl, InjectedIntlProps} from 'react-intl';
import Page from './Page';
import {RootState, Api} from '../module/reducer';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';

interface Props extends React.HTMLAttributes<HTMLDivElement> {}

interface ConnectedProps {}

interface DispatchProps {}

const NotSupported: React.SFC<Props & ConnectedProps & DispatchProps & InjectedIntlProps> = ({
  intl: {formatMessage: _},
}) => {
  return (
    <Page>
      <ContainerXS centerText verticalCenter>
        <Logo scale={1.68} data-uie-name="ui-wire-logo" />
        <Text>{_(indexStrings.loginInfo)}</Text>
      </ContainerXS>
    </Page>
  );
};

export default injectIntl(
  connect(
    (state: RootState): ConnectedProps => ({}),
    (dispatch: ThunkDispatch<RootState, Api, AnyAction>): DispatchProps => ({})
  )(NotSupported)
);
