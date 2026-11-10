/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React, {type FunctionComponent} from 'react';

import {connect} from 'react-redux';
import {useNavigate} from 'react-router';
import {AnyAction, Dispatch} from 'redux';

import {EntropyContainer} from './entropyContainer';
import {Page} from './page';

import {AccountRegistrationLayout} from '../component/accountRegistrationLayout';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {bindActionCreators, type ThunkAction} from '../module/reducer';
import {ROUTE} from '../route';

type Props = React.HTMLProps<HTMLDivElement>;

const SetEntropyPageComponent: FunctionComponent<Props & ConnectedProps & DispatchProps> = ({
  pushEntropyData,
}: Props & ConnectedProps & DispatchProps) => {
  const navigate = useNavigate();

  const onSetEntropy = async (entropyData: Uint8Array): Promise<void> => {
    try {
      await pushEntropyData(entropyData);
      navigate(ROUTE.VERIFY_EMAIL_CODE);
    } catch (error: unknown) {
      console.warn(error);
    }
  };

  return (
    <Page>
      <AccountRegistrationLayout>
        <EntropyContainer onSetEntropy={onSetEntropy} />
      </AccountRegistrationLayout>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
type MapStateToPropsResult = {};
const mapStateToProps = (): MapStateToPropsResult => {
  return {};
};

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
type MapDispatchToPropsResult = {pushEntropyData: (entropy: Uint8Array) => ThunkAction};
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>): MapDispatchToPropsResult => {
  return bindActionCreators(
    {
      pushEntropyData: ROOT_ACTIONS.authAction.pushEntropyData,
    },
    dispatch,
  );
};

const SetEntropyPage = connect(mapStateToProps, mapDispatchToProps)(SetEntropyPageComponent);

export {SetEntropyPage};
