module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.simple.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.simple.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*)/)'
  ]
};