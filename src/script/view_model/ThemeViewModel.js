/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

const THEMES_CLASS_PREFIX = 'theme-';
export const THEMES = {
  DARK: 'dark',
  DEFAULT: 'default',
};

class ThemeViewModel {
  constructor(mainViewModel, repositories) {
    this.propertiesRepository = repositories.properties;
    this.setTheme = this.setTheme.bind(this);

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.INTERFACE.USE_DARK_MODE_TOGGLE, useDarkMode => {
      const newTheme = useDarkMode ? THEMES.DARK : THEMES.DEFAULT;
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.INTERFACE.THEME, newTheme);
    });
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.INTERFACE.THEME, this.setTheme);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, properties =>
      this.setTheme(properties.settings.interface.theme)
    );
  }

  setTheme(newTheme) {
    const classes = document.body.className
      .split(' ')
      .filter(elementClass => !elementClass.startsWith(THEMES_CLASS_PREFIX))
      .concat(`${THEMES_CLASS_PREFIX}${newTheme}`);
    document.body.className = classes.join(' ');
  }
}

export default ThemeViewModel;
