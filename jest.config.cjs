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
  reporters: ['default'],
  testPathIgnorePatterns: [
    '<rootDir>/src/app/features/players/players.component.spec.ts',
    '<rootDir>/src/app/features/players/__tests__/players.component.spec.ts',
    '<rootDir>/src/app/features/players/services/ai-worker.service.spec.ts',
    '<rootDir>/src/app/features/players/services/ai-worker-latency.spec.ts'
  ]
};