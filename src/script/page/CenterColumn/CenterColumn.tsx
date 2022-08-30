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

import {FC} from 'react';

import HistoryExport from 'Components/HistoryExport';
// import HistoryImport from 'Components/HistoryImport';
import ConnectRequests from 'Components/ConnectRequests';
import ConversationList from 'Components/Conversation';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import MainContent from '../MainContent';
import RootProvider from '../RootProvider';

import {ContentViewModel} from '../../view_model/ContentViewModel';

interface CenterColumnProps {
  contentViewModel: ContentViewModel;
}

const CenterColumn: FC<CenterColumnProps> = ({contentViewModel}) => {
  const {state: currentState} = useKoSubscribableChildren(contentViewModel, ['state']);

  const teamState = contentViewModel.getTeamState();
  const userState = contentViewModel.getUserState();

  return (
    <RootProvider value={contentViewModel}>
      <MainContent contentViewModel={contentViewModel} />

      {currentState === ContentViewModel.STATE.CONNECTION_REQUESTS && (
        <>
          <h1 className="visually-hidden">{t('accessibility.headings.connectionRequests')}</h1>

          <ConnectRequests
            actionsViewModel={contentViewModel.mainViewModel.actions}
            teamState={teamState}
            userState={userState}
          />
        </>
      )}

      {currentState === ContentViewModel.STATE.CONVERSATION && (
        <>
          <h1 className="visually-hidden">{t('accessibility.headings.conversation')}</h1>

          <ConversationList teamState={teamState} userState={userState} />
        </>
      )}

      {currentState === ContentViewModel.STATE.HISTORY_EXPORT && (
        <>
          <h1 className="visually-hidden">{t('accessibility.headings.historyExport')}</h1>

          <HistoryExport backupRepository={contentViewModel.repositories.backup} userState={userState} />
        </>
      )}

      {/*{currentState === ContentViewModel.STATE.HISTORY_IMPORT && (*/}
      {/*  <>*/}
      {/*    <h1 className="visually-hidden">{t('accessibility.headings.historyImport')}</h1>*/}

      {/*    <HistoryImport backupRepository={contentViewModel.repositories.backup} />*/}
      {/*  </>*/}
      {/*)}*/}
    </RootProvider>
  );
};

export default CenterColumn;

registerReactComponent('center-column', CenterColumn);
