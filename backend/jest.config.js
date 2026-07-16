export default {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
    clearMocks: true,
    restoreMocks: true,
    resetMocks: true,
    verbose: true
};