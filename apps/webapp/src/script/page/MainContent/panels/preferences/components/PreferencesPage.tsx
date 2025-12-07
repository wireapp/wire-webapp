/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {useAppMainState, ViewType} from 'src/script/page/state';

import {IconButton, IconButtonVariant, QUERY, useMatchMedia} from '@wireapp/react-ui-kit';

import {buttonsStyle, contentStyle, titleStyle, wrapperStyle} from './PreferencesPage.styles';

interface PreferencesPageProps {
  children: React.ReactNode;
  title: string;
}

const PreferencesPage: FC<PreferencesPageProps> = ({title, children}) => {
  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const smBreakpoint = useMatchMedia(QUERY.tabletSMDown);

  const {currentView, setCurrentView} = useAppMainState(state => state.responsiveView);
  const isCentralColumn = currentView == ViewType.MOBILE_CENTRAL_COLUMN;

  return (
    <div role="tabpanel" aria-labelledby={title} css={wrapperStyle}>
      <div className="preferences-titlebar">
        {smBreakpoint && isCentralColumn && (
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            className="conversation-title-bar-icon icon-back"
            css={buttonsStyle}
            onClick={() => setCurrentView(ViewType.MOBILE_LEFT_SIDEBAR)}
          />
        )}
        <h2 className="preferences-titlebar" css={titleStyle(smBreakpoint && isCentralColumn)}>
          {title}
        </h2>
      </div>
      <FadingScrollbar className="preferences-content" css={contentStyle}>
        {children}
      </FadingScrollbar>
    </div>
  );
};

export {PreferencesPage};
