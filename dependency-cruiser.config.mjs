/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {circular: true},
    },
  ],
  options: {
    doNotFollow: {path: '(^|/)node_modules/'},
    exclude: {
      path: [
        '(^|/)(node_modules|dist|build|coverage|target|test-results|playwright-report|blob-report)/',
        '^apps/webapp/(resource|assets)/',
        '^apps/webapp/src/ext/',
        '^apps/webapp/src/script/components/icon\\.tsx$',
      ],
    },
    moduleSystems: ['cjs', 'es6', 'tsd'],
    tsPreCompilationDeps: true,
    tsConfig: {fileName: 'apps/webapp/tsconfig.json'},
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['main', 'types', 'typings'],
    },
    combinedDependencies: true,
  },
};
