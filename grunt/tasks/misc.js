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

'use strict';

const path = require('path');

module.exports = grunt => {
  grunt.registerTask('set_version', () => {
    grunt.task.run('gitinfo');
    const target = grunt.config('gitinfo.local.branch.current.name');
    grunt.log.ok(`Version target set to ${target}`);

    let user = grunt.config('gitinfo.local.branch.current.currentUser');
    if (user) {
      user = user.substr(0, user.indexOf(' ')).toLowerCase();
    }

    const date = new Date();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    const hour = `0${date.getHours()}`.slice(-2);
    const minute = `0${date.getMinutes()}`.slice(-2);

    let version = `${date.getFullYear()}-${month}-${day}-${hour}-${minute}`;
    if (user) {
      version = `${version}-${user}`;
    }
    if (target) {
      version = `${version}-${target}`;
    }

    grunt.log.ok(`Version set to ${version}`);
    grunt.file.write(path.join('dist', 'version'), version);
  });

  grunt.registerTask('prepare', [
    'clean:dist',
    'shell:less',
    'postcss',
    'copy:dist',
    'copy:dist_audio',
    'copy:dist_favicon',
    'includereplace:prod_index',
    'includereplace:prod_auth',
    'includereplace:prod_login',
    'clean:dist_app',
    'clean:dist_script',
  ]);
};
