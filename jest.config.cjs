module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src/app'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/__tests__/**/*.spec.ts','**/?(*.)+(spec|test).ts'],
  transformIgnorePatterns: [
    'node_modules/(?!@angular|rxjs)'
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/src/test/coverage',
  coverageReporters: ['text','lcov'],
  moduleFileExtensions: ['ts','html','js','json','mjs'],
  reporters: ['default']
};