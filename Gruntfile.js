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

const {format} = require('date-fns');

const path = require('path');

const {SRC_PATH, DIST_PATH} = require('./locations');

module.exports = grunt => {
  require('load-grunt-tasks')(grunt);

  /* eslint-disable sort-keys-fix/sort-keys-fix */
  const dir = {
    src_: SRC_PATH,
    src: {
      page: `${SRC_PATH}/page`,
      style: `${SRC_PATH}/style`,
    },
    server: 'server',
    dist: {
      s3: `${DIST_PATH}/s3`,
      static: `${DIST_PATH}/static`,
      templates: `${DIST_PATH}/templates`,
    },
    dist_: DIST_PATH,
    resource: 'resource',
    test: {
      api: 'test/api',
      coverage: 'test/coverage',
      lib: 'test/lib',
      unitTests: 'test/unit_tests',
    },
  };

  grunt.initConfig({
    dir,
    clean: {
      dist: '<%= dir.dist.static %>',
      dist_src: '<%= dir.dist.templates %>/<%= dir.src_ %>',
      dist_s3: '<%= dir.dist.s3 %>',
    },
    compress: require('./grunt/config/compress'),
    copy: require('./grunt/config/copy'),
    includereplace: require('./grunt/config/includereplace'),
    postcss: require('./grunt/config/postcss'),
    shell: require('./grunt/config/shell'),
    watch: require('./grunt/config/watch'),
  });
  /* eslint-enable sort-keys-fix/sort-keys-fix */

  grunt.registerTask('build', ['set_version', 'build_style', 'copy', 'build_markup']);

  grunt.registerTask('build_style', ['shell:less', 'postcss']);

  grunt.registerTask('build_markup', ['includereplace:prod_index', 'includereplace:prod_auth']);

  grunt.registerTask('build_prod', ['build', 'compress']);

  grunt.registerTask('set_version', () => {
    const version = format(new Date(), 'yyyy.MM.dd.HH.mm');
    grunt.log.ok(`Version set to ${version}`);
    grunt.file.write(path.join('server/dist/version'), version);
  });
};
