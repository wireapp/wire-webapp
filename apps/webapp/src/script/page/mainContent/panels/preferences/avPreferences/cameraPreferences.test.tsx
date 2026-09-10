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

import {render} from '@testing-library/react';

import {Config} from 'src/script/Config';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';

import type {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';

import en from 'I18n/en-US.json';

import {CameraPreferences} from './cameraPreferences';

const legacyRootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));
const reactTranslationRenderingRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    isFeatureToggleEnabled(featureName): boolean {
      return featureName === reactTranslationRenderingFeatureToggleName;
    },
    translate,
  }),
);
const cameraAccessDeniedUrl = 'https://support.example/camera-access-denied';

type TranslationTestFunction = () => void | Promise<void>;
type IsolatedTranslationTestFunction = () => Promise<void>;
type CameraConfigurationOptions = {
  readonly brandName?: string;
};

function withTranslationStrings(
  strings: typeof en,
  testFunction: TranslationTestFunction,
): IsolatedTranslationTestFunction {
  return async function runTranslationTest(): Promise<void> {
    setStrings({en: strings});

    try {
      await testFunction();
    } finally {
      setStrings({en});
    }
  };
}

function withCameraConfiguration(
  options: CameraConfigurationOptions,
  testFunction: TranslationTestFunction,
): IsolatedTranslationTestFunction {
  return async function runCameraTest(): Promise<void> {
    const originalConfig = Config.getConfig();
    const {brandName = originalConfig.BRAND_NAME} = options;
    const configWithTestValues = {
      ...originalConfig,
      BRAND_NAME: brandName,
      URL: {
        ...originalConfig.URL,
        SUPPORT: {
          ...originalConfig.URL.SUPPORT,
          CAMERA_ACCESS_DENIED: cameraAccessDeniedUrl,
        },
      },
    };
    const configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue(configWithTestValues);

    try {
      await testFunction();
    } finally {
      configSpy.mockRestore();
    }
  };
}

function createStreamHandlerForTest(): MediaStreamHandler {
  return {
    requestMediaStream: jest.fn().mockResolvedValue(undefined),
    releaseTracksFromStream: jest.fn(),
  } as unknown as MediaStreamHandler;
}

function renderCameraPreferences(
  rootProviderWrapper: ReturnType<typeof createRootProviderWrapperForTest>,
): ReturnType<typeof render> {
  return render(
    withThemeAndRootContext(
      <CameraPreferences
        hasActiveCameraStream={false}
        refreshStream={jest.fn().mockResolvedValue(undefined)}
        streamHandler={createStreamHandlerForTest()}
      />,
      rootProviderWrapper,
    ),
  );
}

describe('CameraPreferences', () => {
  it(
    'keeps the legacy no-camera translation rendering when React translation rendering is disabled',
    withCameraConfiguration(
      {},
      withTranslationStrings(en, () => {
        const {container} = renderCameraPreferences(legacyRootProviderWrapper);
        const noCameraMessage = container.querySelector('.preferences-av-video-disabled__info');
        const faqLink = noCameraMessage?.querySelector('a');

        expect(noCameraMessage).toHaveTextContent('doesn’t have access to the camera.');
        expect(noCameraMessage?.querySelectorAll('br')).toHaveLength(1);
        expect(faqLink).toHaveTextContent('Read this support article');
        expect(faqLink).toHaveAttribute('href', cameraAccessDeniedUrl);
        expect(faqLink).toHaveAttribute('target', '_blank');
        expect(faqLink).toHaveAttribute('rel', 'noopener noreferrer');
        expect(faqLink).toHaveAttribute('data-uie-name', 'go-no-camera-faq');
      }),
    ),
  );

  it(
    'renders the FAQ link and line break as React nodes when enabled',
    withCameraConfiguration(
      {},
      withTranslationStrings(en, () => {
        const {container} = renderCameraPreferences(reactTranslationRenderingRootProviderWrapper);
        const noCameraMessage = container.querySelector('.preferences-av-video-disabled__info');
        const faqLink = noCameraMessage?.querySelector('a');

        expect(noCameraMessage).toHaveTextContent('doesn’t have access to the camera.');
        expect(noCameraMessage?.querySelectorAll('br')).toHaveLength(1);
        expect(faqLink).toHaveTextContent('Read this support article');
        expect(faqLink).toHaveAttribute('href', cameraAccessDeniedUrl);
        expect(faqLink).toHaveAttribute('target', '_blank');
        expect(faqLink).toHaveAttribute('rel', 'noopener noreferrer');
        expect(faqLink).toHaveAttribute('data-uie-name', 'go-no-camera-faq');
      }),
    ),
  );

  it(
    'follows translated FAQ link and brand-name positions while keeping the brand name literal',
    withCameraConfiguration(
      {brandName: 'R&D <Test>'},
      withTranslationStrings(
        {
          ...en,
          preferencesAVNoCamera: 'Need help? [faqLink]Camera troubleshooting[/faqLink][br]{brandName}',
        },
        () => {
          const {container} = renderCameraPreferences(reactTranslationRenderingRootProviderWrapper);
          const noCameraMessage = container.querySelector('.preferences-av-video-disabled__info');
          const faqLink = noCameraMessage?.querySelector('a');

          expect(noCameraMessage?.textContent).toBe('Need help? Camera troubleshootingR&D <Test>');
          expect(faqLink).toHaveTextContent('Camera troubleshooting');
          expect(noCameraMessage?.querySelectorAll('br')).toHaveLength(1);
          expect(container.querySelector('test')).toBeNull();
        },
      ),
    ),
  );

  it(
    'keeps a translation-looking brand name literal instead of creating another link',
    withCameraConfiguration(
      {brandName: '[faqLink]Wire[/faqLink]'},
      withTranslationStrings(
        {
          ...en,
          preferencesAVNoCamera: '{brandName}[br][faqLink]Read this support article[/faqLink]',
        },
        () => {
          const {container} = renderCameraPreferences(reactTranslationRenderingRootProviderWrapper);
          const noCameraMessage = container.querySelector('.preferences-av-video-disabled__info');

          expect(noCameraMessage?.textContent).toBe('[faqLink]Wire[/faqLink]Read this support article');
          expect(noCameraMessage?.querySelectorAll('a')).toHaveLength(1);
          expect(noCameraMessage?.querySelector('a')).toHaveTextContent('Read this support article');
        },
      ),
    ),
  );

  it(
    'keeps unsupported translation markup as text when enabled',
    withCameraConfiguration(
      {},
      withTranslationStrings(
        {
          ...en,
          preferencesAVNoCamera: '<img src="example">[br][faqLink]Read this support article[/faqLink]',
        },
        () => {
          const {container} = renderCameraPreferences(reactTranslationRenderingRootProviderWrapper);
          const noCameraMessage = container.querySelector('.preferences-av-video-disabled__info');

          expect(noCameraMessage).toHaveTextContent('<img src="example">Read this support article');
          expect(noCameraMessage?.querySelector('img')).toBeNull();
          expect(noCameraMessage?.querySelectorAll('br')).toHaveLength(1);
        },
      ),
    ),
  );
});
