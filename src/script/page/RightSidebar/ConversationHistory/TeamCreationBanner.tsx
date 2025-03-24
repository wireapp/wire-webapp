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

import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {
  teamCreationBodyCss,
  teamCreationButtonCss,
  teamCreationTextCss,
  teamCreationWrapperCss,
} from './ConversationHistory.styles';

export const TeamCreationBanner = () => {
  return (
    <div css={teamCreationWrapperCss}>
      <div css={teamCreationBodyCss}>
        <Text block css={teamCreationTextCss}>
          {t('createConversationUpgradePlanModalText')}
        </Text>
        <Button
          css={teamCreationButtonCss}
          type="button"
          // TODO: Implement onClick
          onClick={() => {}}
          data-uie-name="do-submit"
          // TODO: Implement callback
          onKeyDown={event => handleKeyDown({event, callback: () => {}, keys: [KEY.ENTER, KEY.SPACE]})}
        >
          {t('createConversationUpgradePlanModalButton')}
        </Button>
      </div>
    </div>
  );
};
