#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

# @formatter:off
module.exports = (grunt) ->
  require('load-grunt-tasks') grunt

  path = require 'path'

  config =
    aws:
      port: 5000
    server:
      port: 8888

  dir =
    app_: 'app'
    app:
      demo: 'app/demo'
      ext: 'app/ext'
      page: 'app/page'
      script: 'app/script'
      style: 'app/style'
      template_dist: 'app/page/template/_dist'
    aws_: 'aws'
    aws:
      s3: 'aws/s3'
      static: 'aws/static'
      templates: 'aws/templates'
    deploy: 'deploy'
    dist: 'dist'
    docs:
      api: 'docs/api'
      coverage: 'docs/coverage'
    temp: 'temp'
    test_: 'test'
    test:
      api: 'test/api'
      coffee: 'test/coffee'
      coverage: 'test/coverage'
      js: 'test/js'
      lib: 'test/lib'
      unit_tests: 'test/unit_tests'

  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    config: config
    dir: dir
    aws_s3:           require "./grunt/config/aws_s3"
    bower:            require "./grunt/config/bower"
    clean:            require "./grunt/config/clean"
    coffee:           require "./grunt/config/coffee"
    coffeelint:       require "./grunt/config/coffeelint"
    compress:         require "./grunt/config/compress"
    connect:          require "./grunt/config/connect"
    copy:             require "./grunt/config/copy"
    includereplace:   require "./grunt/config/includereplace"
    karma:            require "./grunt/config/karma"
    less:             require "./grunt/config/less"
    open:             require "./grunt/config/open"
    path:             require "path"
    shell:            require "./grunt/config/shell"
    todo:             require "./grunt/config/todo"
    uglify:           require "./grunt/config/uglify"
    watch:            require "./grunt/config/watch"
    postcss:          require "./grunt/config/postcss"

###############################################################################
# Tasks
###############################################################################
  grunt.loadTasks 'grunt/tasks'
  grunt.registerTask 'default',            ['prepare_dist', 'host']
  grunt.registerTask 'init',               ['clean:ext', 'clean:temp', 'bower', 'scripts']

###############################################################################
# Deploy to different environments
###############################################################################
  grunt.registerTask 'app_deploy',         ['gitinfo', 'aws_deploy']
  grunt.registerTask 'app_deploy_staging', ['gitinfo', 'set_version:staging', 'aws_deploy']
  grunt.registerTask 'app_deploy_prod',    ['gitinfo', 'set_version:prod', 'aws_deploy']

  grunt.registerTask 'app_deploy_travis', (target) ->
    if target in ['prod', 'staging']
      grunt.task.run "set_version:#{target}", 'init', "prepare_#{target}", 'aws_prepare'
    else if target is 'dev'
      grunt.task.run "set_version:staging", 'init', "prepare_staging", 'aws_prepare'
    else
      grunt.fail.warn 'Invalid target specified. Valid targets are: "prod" & "staging"'

###############################################################################
# Test Related
###############################################################################
  grunt.registerTask 'test', ->
    grunt.task.run ['clean:docs_coverage', 'scripts', 'test_init', 'test_prepare', 'karma:test']

  grunt.registerTask 'test_prepare', (test_name) ->
    scripts = grunt.config 'scripts'
    # Little hack because of a configuration bug in "grunt-karma":
    # @see https://github.com/karma-runner/grunt-karma/issues/21#issuecomment-27518692
    prepare_file_names = (file_name_array) =>
      return (file_name.replace 'deploy/', '' for file_name in file_name_array)

    helper_files = grunt.config.get 'karma.options.files'
    app_files = prepare_file_names scripts.app
    component_files = prepare_file_names scripts.component
    vendor_files = prepare_file_names scripts.vendor
    test_files = if test_name then ["../test/js/#{test_name}Spec.js"] else ['../test/**/*Spec.js']

    files = [].concat helper_files, vendor_files, component_files, app_files, test_files
    grunt.config 'karma.options.files', files

  grunt.registerTask 'test_init', ['prepare_dist', 'prepare_test']

  grunt.registerTask 'test_run', (test_name) ->
    grunt.config 'karma.options.reporters', ['progress']
    grunt.task.run ['scripts', 'newer:coffee:dist', 'newer:coffee:test', "test_prepare:#{test_name}", 'karma:test']

# @formatter:on
