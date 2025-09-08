/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  passWithNoTests: true,

  // ✅ Only look in the folder that exists right now
  roots: ['<rootDir>/__tests__'],

  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s',
    '**/?(*.)+(spec|test).[jt]s'
  ],

  moduleFileExtensions: ['ts', 'js', 'json'],

  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
};

