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

const webpack = require('webpack');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');

module.exports = grunt => {
  require('load-grunt-tasks')(grunt);

  const config = {
    aws: {
      port: 5000,
    },
    server: {
      port: 8888,
    },
  };

  /* eslint-disable sort-keys */
  const dir = {
    app_: 'app',
    app: {
      demo: 'app/demo',
      ext: 'app/ext',
      page: 'app/page',
      script: 'app/script',
      style: 'app/style',
      template_dist: 'app/page/template/_dist',
    },
    aws_: 'aws',
    aws: {
      s3: 'aws/s3',
      static: 'aws/static',
      templates: 'aws/templates',
    },
    deploy: 'deploy',
    dist: 'dist',
    docs: {
      api: 'docs/api',
      coverage: 'docs/coverage',
    },
    temp: 'temp',
    test_: 'test',
    test: {
      api: 'test/api',
      coverage: 'test/coverage',
      lib: 'test/lib',
      unit_tests: 'test/unit_tests',
    },
  };

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    config: config,
    dir: dir,
    aws_s3: require('./grunt/config/aws_s3'),
    npmBower: require('./grunt/config/npmBower'),
    clean: require('./grunt/config/clean'),
    compress: require('./grunt/config/compress'),
    concat: require('./grunt/config/concat'),
    connect: require('./grunt/config/connect'),
    copy: require('./grunt/config/copy'),
    includereplace: require('./grunt/config/includereplace'),
    karma: require('./grunt/config/karma'),
    less: require('./grunt/config/less'),
    open: require('./grunt/config/open'),
    path: require('path'),
    postcss: require('./grunt/config/postcss'),
    shell: require('./grunt/config/shell'),
    todo: require('./grunt/config/todo'),
    uglify: require('./grunt/config/uglify'),
    watch: require('./grunt/config/watch'),
  });
  /* eslint-enable sort-keys */

  // Tasks
  grunt.loadTasks('grunt/tasks');
  grunt.registerTask('default', ['prepare_dist', 'host']);
  grunt.registerTask('init', ['clean:temp', 'npmBower', 'copy:frontend', 'npmWebpack', 'scripts']);

  // Deploy to different environments
  grunt.registerTask('app_deploy', ['gitinfo', 'aws_deploy']);
  grunt.registerTask('app_deploy_staging', ['gitinfo', 'set_version:staging', 'aws_deploy']);
  grunt.registerTask('app_deploy_prod', ['gitinfo', 'set_version:prod', 'aws_deploy']);

  grunt.registerTask('app_deploy_travis', target => {
    if (target === 'prod' || target === 'staging') {
      grunt.task.run(`set_version:${target}`, 'init', `prepare_${target}`, 'aws_prepare');
    } else if (target === 'dev') {
      grunt.task.run('set_version:staging', 'init', 'prepare_staging', 'aws_prepare');
    } else {
      grunt.fail.warn('Invalid target specified. Valid targets are: "prod" & "staging"');
    }
  });

  // Test Related
  grunt.registerTask('test', () =>
    grunt.task.run(['clean:docs_coverage', 'scripts', 'test_init', 'test_prepare', 'karma:test'])
  );

  grunt.registerTask('npmWebpack', function() {
    const done = this.async();

    const compiler = webpack(require('./webpack.config.npm.js'));

    compiler.apply(
      new ProgressPlugin((percentage, message) => {
        grunt.log.ok(`${~~(percentage * 100)}%`, message);
      })
    );

    compiler.run(error => {
      if (error) {
        grunt.log.error(`Plugin failed: ${error.message}`);
        throw error;
      }

      done();
    });
  });

  grunt.registerTask('test_prepare', test_name => {
    const scripts = grunt.config('scripts');
    const scripts_minified = grunt.config('scripts_minified');

    const prepare_file_names = file_names => file_names.map(name => name.replace('deploy/', ''));

    const helper_files = grunt.config.get('karma.options.files');
    const app_files = prepare_file_names(scripts_minified.app.concat(scripts.app));
    const component_files = prepare_file_names(scripts_minified.component.concat(scripts.component));
    const vendor_files = prepare_file_names(scripts_minified.vendor.concat(scripts.vendor));
    const test_files = test_name ? [`../test/unit_tests/${test_name}Spec.js`] : ['../test/unit_tests/**/*Spec.js'];

    const files = [].concat(helper_files, vendor_files, component_files, app_files, test_files);

    grunt.config('karma.options.files', files);
  });

  grunt.registerTask('test_init', ['prepare_dist']);

  grunt.registerTask('test_run', test_name => {
    grunt.config('karma.options.reporters', ['progress']);
    grunt.task.run(['scripts', 'newer:copy:dist_js', `test_prepare:${test_name}`, 'karma:test']);
  });
};
