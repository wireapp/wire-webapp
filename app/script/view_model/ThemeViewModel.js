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
const THEMES = {
  DARK: 'dark',
  DEFAULT: 'default',
};

class ThemeViewModel {
  constructor(mainViewModel, repositories) {
    this.propertiesRepository = repositories.properties;
    this.setTheme = this.setTheme.bind(this);

    this.isDarkMode = ko.observable(undefined);
    this.isDarkMode.subscribe(useDarkMode => {
      if (useDarkMode) {
        this.setTheme(THEMES.DARK);
      } else {
        this.setTheme(THEMES.DEFAULT);
      }
    });

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.INTERFACE.THEME, this.isDarkMode);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, properties => {
      this.isDarkMode(properties.settings.interface.theme);
    });
  }

  setTheme(newTheme) {
    const classesWithoutTheme = document.body.className
      .split(' ')
      .filter(elementClass => !elementClass.startsWith(THEMES_CLASS_PREFIX))
      .join(' ');
    const theme = `${THEMES_CLASS_PREFIX}${newTheme}`;
    document.body.className = `${classesWithoutTheme} ${theme}`;
  }
}

export default ThemeViewModel;
