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
  require('load-grunt-tasks')(grunt);

  /* eslint-disable sort-keys */
  const dir = {
    app_: 'app',
    app: {
      demo: 'app/demo',
      ext: 'app/ext',
      page: 'app/page',
      style: 'app/style',
    },
    dist: {
      s3: 'dist/s3',
      static: 'dist/static',
      templates: 'dist/templates',
    },
    dist_: 'dist',
    docs: {
      api: 'docs/api',
      coverage: 'docs/coverage',
    },
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
    open: require('./grunt/config/open'),
    postcss: require('./grunt/config/postcss'),
    shell: require('./grunt/config/shell'),
    watch: require('./grunt/config/watch'),
  });
  /* eslint-enable sort-keys */

  // Tasks
  grunt.loadTasks('grunt/tasks');

  grunt.registerTask('app_deploy_travis', ['set_version', 'prepare', 'aws_prepare']);

  grunt.registerTask('build_dev', [
    'clean:dist',
    'clean:dist_app',
    'clean:dist_s3',
    'set_version',
    'build_dev_style',
    'copy:dist',
    'copy:dist_audio',
    'copy:dist_favicon',
    'build_dev_markup',
  ]);

  grunt.registerTask('build_dev_style', ['shell:less', 'postcss']);

  grunt.registerTask('build_dev_markup', [
    'includereplace:prod_index',
    'includereplace:prod_auth',
    'includereplace:prod_login',
    'includereplace:deploy_demo',
  ]);
};
