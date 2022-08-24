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

import {t} from 'Util/LocalizerUtil';

import MainContent from '../MainContent';

import {ContentViewModel} from '../../view_model/ContentViewModel';
import {registerReactComponent} from 'Util/ComponentUtil';
import RootProvider from './RootProvider';

interface CenterColumnProps {
  contentViewModel: ContentViewModel;
}

const CenterColumn: FC<CenterColumnProps> = ({contentViewModel}) => {
  const currentState = contentViewModel.state();

  return (
    <RootProvider value={contentViewModel}>
      <MainContent contentViewModel={contentViewModel} />

      {currentState === ContentViewModel.STATE.CONNECTION_REQUESTS && (
        <>
          <h1 className="visually-hidden">{t('accessibility.headings.connectionRequests')}</h1>

          {/*<ConnectRequests />*/}
        </>
      )}

      {currentState === ContentViewModel.STATE.CONVERSATION && (
        <>
          <h1 className="visually-hidden">{t('accessibility.headings.conversation')}</h1>

          {/*#include('content/conversation.htm')*/}
        </>
      )}

      {currentState === ContentViewModel.STATE.HISTORY_EXPORT && (
        <>
          <h1 className="visually-hidden">{t('accessibility.headings.historyExport')}</h1>

          {/*<HistoryExport />*/}
        </>
      )}

      {currentState === ContentViewModel.STATE.HISTORY_IMPORT && (
        <>
          <h1 className="visually-hidden">{t('accessibility.headings.historyImport')}</h1>

          {/*#include('content/history-import.htm')*/}
        </>
      )}

      {/*<GroupCreationModal />*/}

      <div className="center-column__overlay"></div>
    </RootProvider>
  );
};

export default CenterColumn;

registerReactComponent('center-column', CenterColumn);
