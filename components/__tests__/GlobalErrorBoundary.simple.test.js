// Simple test for GlobalErrorBoundary
const React = require('react');

describe('GlobalErrorBoundary', () => {
  it('should be importable', () => {
    // Just test that the module can be imported without errors
    expect(() => {
      require('../GlobalErrorBoundary');
    }).not.toThrow();
  });

  it('should export GlobalErrorBoundary class', () => {
    const { GlobalErrorBoundary } = require('../GlobalErrorBoundary');
    expect(GlobalErrorBoundary).toBeDefined();
    expect(typeof GlobalErrorBoundary).toBe('function');
  });
});