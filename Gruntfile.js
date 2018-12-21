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

const path = require('path');
const {SRC_PATH, DIST_PATH} = require('./locations');

module.exports = grunt => {
  require('load-grunt-tasks')(grunt);

  /* eslint-disable sort-keys */
  const dir = {
    src_: SRC_PATH,
    src: {
      demo: `${SRC_PATH}/demo`,
      ext: `${SRC_PATH}/ext`,
      page: `${SRC_PATH}/page`,
      style: `${SRC_PATH}/style`,
    },
    dist: {
      s3: `${DIST_PATH}/s3`,
      static: `${DIST_PATH}/static`,
      templates: `${DIST_PATH}/templates`,
    },
    dist_: DIST_PATH,
    docs: {
      api: 'docs/api',
      coverage: 'docs/coverage',
    },
    resource: 'resource',
    test_: 'test',
    test: {
      api: 'test/api',
      coverage: 'test/coverage',
      lib: 'test/lib',
      unitTests: 'test/unit_tests',
    },
  };

  grunt.initConfig({
    dir: dir,
    aws_s3: require('./grunt/config/aws_s3'),
    clean: require('./grunt/config/clean'),
    compress: require('./grunt/config/compress'),
    copy: require('./grunt/config/copy'),
    includereplace: require('./grunt/config/includereplace'),
    npmBower: require('./grunt/config/npmBower'),
    open: require('./grunt/config/open'),
    postcss: require('./grunt/config/postcss'),
    shell: require('./grunt/config/shell'),
    watch: require('./grunt/config/watch'),
  });
  /* eslint-enable sort-keys */

  grunt.registerTask('init', 'npmBower');

  grunt.registerTask('build', [
    'clean:dist',
    'clean:dist_src',
    'clean:dist_s3',
    'set_version',
    'build_style',
    'copy:dist_serviceworker',
    'copy:dist_resource',
    'build_markup',
  ]);

  grunt.registerTask('build_style', ['shell:less', 'postcss']);

  grunt.registerTask('build_markup', [
    'includereplace:prod_index',
    'includereplace:prod_auth',
    'includereplace:prod_login',
  ]);

  grunt.registerTask('build_prod', ['build', 'shell:dist_bundle', 'compress']);

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
    grunt.file.write(path.join('server', 'dist', 'version'), version);
  });
};
