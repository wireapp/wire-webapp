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

import React from 'react';
import Page from './Page';
import EntropyContainer from './EntropyContainer';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {ROUTE} from '../route';
import useReactRouter from 'use-react-router';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {RootState, bindActionCreators} from '../module/reducer';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const SetEntropyPage = ({pushEntropyData}: Props & ConnectedProps & DispatchProps) => {
  const {history} = useReactRouter();
  // const [entropy, setEntropy] = useState<[number, number][]>([]);

  const onSetEntropy = async (entropyData: [number, number][]): Promise<void> => {
    try {
      await pushEntropyData(new Uint8Array(entropyData.filter(Boolean).flat()));
      history.push(ROUTE.VERIFY_EMAIL_CODE);
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <Page>
      <EntropyContainer onSetEntropy={onSetEntropy} />
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      pushEntropyData: ROOT_ACTIONS.authAction.pushEntropyData,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(SetEntropyPage);
