module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/.*)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/build/',
    '/dist/',
    '/web/',
    '/web-client/',
    '/dev-scripts/'
  ],
  modulePathIgnorePatterns: ['<rootDir>/healing-24-agosto'],
  moduleNameMapper: {
    '^expo/src/async-require/messageSocket$': '<rootDir>/jest.mocks/expoMessageSocket.js',
    '^expo-modules-core/src/polyfill/dangerous-internal$': '<rootDir>/jest.mocks/expoDangerousInternal.js',
    '^expo/src/winter(?:/.*)?$': '<rootDir>/jest.mocks/expoWinter.js',
    '^expo/virtual/streams$': '<rootDir>/jest.mocks/expoVirtualStreams.js'
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.[jt]s?(x)', '<rootDir>/__tests__/**/*.spec.[jt]s?(x)'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{ts,tsx}',
    '!src/screens/dev/**',
    '!src/screens/test/**'
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  testEnvironment: 'node',
  globals: {
    __DEV__: true
  }
};
