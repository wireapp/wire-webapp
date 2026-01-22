/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {CallingCell} from 'Components/calling/CallingCell';
import {Call} from 'Repositories/calling/Call';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {ListViewModel} from 'src/script/view_model/ListViewModel';

type ConversationCallingViewProps = {
  activeCalls: Call[];
  listViewModel: ListViewModel;
  classifiedDomains: string[] | undefined;
  propertiesRepository: PropertiesRepository;
};

export const ConversationCallingView = ({
  activeCalls,
  listViewModel,
  classifiedDomains,
  propertiesRepository,
}: ConversationCallingViewProps) => {
  return (
    <>
      {activeCalls.map(call => {
        const {conversation} = call;
        const callingViewModel = listViewModel.callingViewModel;
        const {callingRepository} = callingViewModel;

        return (
          conversation && (
            <CallingCell
              key={conversation.id}
              classifiedDomains={classifiedDomains}
              call={call}
              callActions={callingViewModel.callActions}
              callingRepository={callingRepository}
              propertiesRepository={propertiesRepository}
              isFullUi
              hasAccessToCamera={callingViewModel.hasAccessToCamera()}
            />
          )
        );
      })}
    </>
  );
};
