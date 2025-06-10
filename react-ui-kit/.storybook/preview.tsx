import type {Preview} from '@storybook/react';

import {withThemeFromJSXProvider} from '@storybook/addon-themes';
import {THEME_ID, ThemeProvider, themes, GlobalStyle} from '../src/Identity';

const availableThemes = {
  light: themes[THEME_ID.LIGHT],
  dark: themes[THEME_ID.DARK],
};

const preview: Preview = {
  decorators: [
    withThemeFromJSXProvider({
      themes: availableThemes,
      defaultTheme: 'light',
      Provider: ThemeProvider,
      GlobalStyles: GlobalStyle,
    }),
  ],
  parameters: {
    themes: {
      default: 'light',
      list: [
        {name: 'light', class: '', color: '#ffffff'},
        {name: 'dark', class: '', color: '#000000'},
      ],
      disable: ({viewMode}) => viewMode === 'docs',
    },
    docs: {
      story: {
        inline: true,
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
