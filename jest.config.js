/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  passWithNoTests: true,
  roots: ['<rootDir>/src', '<rootDir>/test', '<rootDir>/__tests__'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json']
};

