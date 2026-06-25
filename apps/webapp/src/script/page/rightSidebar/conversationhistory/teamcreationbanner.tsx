/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Button, Text} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleKeyDown, KEY} from 'Util/keyboardUtil';
import {safeWindowOpen} from 'Util/sanitizationUtil';

import {
  teamCreationBodyCss,
  teamCreationButtonCss,
  teamCreationTextCss,
  teamCreationWrapperCss,
} from './conversationhistory.styles';

export const TeamCreationBanner = () => {
  const {translate} = useApplicationContext();
  const navigateToUpgradePlan = () => {
    safeWindowOpen(Config.getConfig().URL.TEAMS_BASE);
  };

  return (
    <div css={teamCreationWrapperCss}>
      <div css={teamCreationBodyCss}>
        <Text block css={teamCreationTextCss}>
          {translate('createConversationUpgradePlanModalText')}
        </Text>
        <Button
          css={teamCreationButtonCss}
          type="button"
          onClick={navigateToUpgradePlan}
          data-uie-name="do-submit"
          onKeyDown={event => handleKeyDown({event, callback: navigateToUpgradePlan, keys: [KEY.ENTER, KEY.SPACE]})}
        >
          {translate('createConversationUpgradePlanModalButton')}
        </Button>
      </div>
    </div>
  );
};
