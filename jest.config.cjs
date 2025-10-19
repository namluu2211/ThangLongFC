module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Broaden roots to include full app so newly added feature specs are discovered.
  roots: ['<rootDir>/src/app'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(ts|mjs)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json', useESM: true, diagnostics: false }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!@angular|rxjs)'
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text','lcov'],
  testMatch: ['**/__tests__/**/*.spec.ts','**/?(*.)+(spec|test).ts']
  ,moduleNameMapper: {
    '^@angular/core$': '<rootDir>/jest-stubs/angular-core.stub.ts'
  },
  testPathIgnorePatterns: [
    '<rootDir>/src/app/features/players/players.component.spec.ts',
    '<rootDir>/src/app/features/players/__tests__/players.component.spec.ts',
    '<rootDir>/src/app/features/players/services/ai-worker.service.spec.ts',
    '<rootDir>/src/app/features/players/services/ai-worker-latency.spec.ts'
  ],
  setupFiles: ['<rootDir>/jest-stubs/setup-env.ts']
};
