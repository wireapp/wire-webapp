/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {ReactNode} from 'react';

import {Config} from 'src/script/Config';
import {renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';

export function renderMlsSystemMessageCaption(caption: string): ReactNode[] {
  return renderReactTranslation({
    translatedText: caption,
    componentReplacements: [
      {
        start: '[link]',
        end: '[/link]',
        render(children) {
          return (
            <a href={Config.getConfig().URL.SUPPORT.MLS_LEARN_MORE} rel="nofollow noopener noreferrer" target="_blank">
              {children}
            </a>
          );
        },
      },
    ],
    nodeReplacements: [],
    valueReplacements: [],
  });
}
