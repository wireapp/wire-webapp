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

import type {FunctionComponent, ReactNode} from 'react';

import {Config} from '../Config';
import {createReactTranslationMarker, renderReactTranslation} from '../util/localizerUtil/reactLocalizerUtil';
import type {Translate} from '../util/localizerUtil/translationTypes';

const cameraBrandNameMarker = createReactTranslationMarker('camera-brand-name');
const cameraLineBreakMarker = createReactTranslationMarker('camera-line-break');
const cameraFaqLinkMarker = createReactTranslationMarker('camera-faq-link');

type NoCameraMessageProperties = {
  readonly brandName: string;
  readonly translate: Translate;
};

export const NoCameraMessage: FunctionComponent<NoCameraMessageProperties> = ({brandName, translate}) => {
  const translatedText = translate(
    'preferencesAVNoCamera',
    {brandName: cameraBrandNameMarker.substitution},
    {
      '/faqLink': cameraFaqLinkMarker.end,
      br: cameraLineBreakMarker.substitution,
      faqLink: cameraFaqLinkMarker.start,
    },
  );

  return (
    <div className="preferences-av-video-disabled__info">
      {renderReactTranslation({
        translatedText,
        componentReplacements: [
          {
            start: cameraFaqLinkMarker.start,
            end: cameraFaqLinkMarker.end,
            render(children): ReactNode {
              return (
                <a
                  href={Config.getConfig().URL.SUPPORT.CAMERA_ACCESS_DENIED}
                  data-uie-name="go-no-camera-faq"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              );
            },
          },
        ],
        nodeReplacements: [
          {
            marker: cameraLineBreakMarker,
            render(): ReactNode {
              return <br />;
            },
          },
        ],
        valueReplacements: [{marker: cameraBrandNameMarker, runtimeText: brandName}],
      })}
    </div>
  );
};
