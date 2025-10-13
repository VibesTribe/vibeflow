const tsJestTransformer = require.resolve('ts-jest');

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  passWithNoTests: true,
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s',
    '**/?(*.)+(spec|test).[jt]s'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleDirectories: ['node_modules'],
  transform: {
    '^.+\\.ts$': tsJestTransformer
  }
};
