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

module.exports = grunt => {
  function extract_sources(source_file, target) {
    const scripts = grunt.file.read(source_file);
    const script_files = [];

    // parse app scripts
    const lines = scripts.split('\n');
    for (const line of lines) {
      const has_source = line.match(/src="(.*?)"/);
      const is_comment = line.match(/<!--[\s\S]*?-->/);

      if (has_source && !is_comment) {
        let current_files;
        const source = has_source[1];

        if (source.endsWith('.min.js')) {
          current_files = grunt.config('scripts_minified');
          current_files[target].push(`deploy${source}`);
          grunt.config('scripts_minified', current_files);
          grunt.log.writeln(`Minified script '${source}' for target '${target}' will not get uglified.`);
        } else {
          current_files = grunt.config('scripts');
          current_files[target].push(`deploy${source}`);
          grunt.config('scripts', current_files);
        }
      }
    }

    grunt.log.ok(`Processed files from '${source_file}'.`);

    return script_files;
  }

  grunt.registerTask('scripts', () => {
    const dist_path = grunt.config('dir.app.templateDist');

    const directories = {
      app: [],
      component: [],
      login: [],
      vendor: [],
    };

    grunt.config('scripts', directories);
    grunt.config('scripts_minified', directories);

    Object.keys(directories).forEach(directory_name => {
      extract_sources(`${dist_path}/${directory_name}.htm`, directory_name);
    });
  });
};
