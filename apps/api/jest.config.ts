import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@crypto-edge/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@crypto-edge/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
