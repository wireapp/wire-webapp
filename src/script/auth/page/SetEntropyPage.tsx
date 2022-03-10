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

import React, {useState} from 'react';
import Page from './Page';
import SetEntropy from './SetEntropy';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {BackendError} from '../module/action/BackendError';
import {ROUTE} from '../route';
import useReactRouter from 'use-react-router';
import {useTimeout} from '@wireapp/react-ui-kit';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {bindActionCreators} from '../module/reducer';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const SetEntropyPage = ({doSetEntropy}: Props & DispatchProps) => {
  const {history} = useReactRouter();
  const [entropy, setEntropy] = useState<[number, number][]>([]);
  const [error, setError] = useState(null);

  const onSetEntropy = async (): Promise<void> => {
    try {
      await doSetEntropy(new Uint8Array(entropy.filter(Boolean).flat()));
      useTimeout(() => history.push(ROUTE.VERIFY_EMAIL_CODE), 10000);
    } catch (error) {
      if (error.label === BackendError.HANDLE_ERRORS.INVALID_HANDLE) {
        error.label = BackendError.HANDLE_ERRORS.HANDLE_TOO_SHORT;
      }
      setError(error);
    }
  };

  return (
    <Page>
      <SetEntropy
        entropy={entropy}
        setEntropy={setEntropy}
        error={error}
        onSetEntropy={onSetEntropy}
        setError={setError}
      />
    </Page>
  );
};

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doSetEntropy: ROOT_ACTIONS.authAction.doSetEntropy,
    },
    dispatch,
  );

export default connect(mapDispatchToProps)(SetEntropyPage);
