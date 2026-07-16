export const createMockRequest = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    session: {},
    sessionID: 'session-1',
    headers: {},
    ...overrides
});