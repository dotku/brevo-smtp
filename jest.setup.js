// jest.setup.js
// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array

// Add any global setup for tests here
import '@testing-library/jest-dom';

// Mock localStorage
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true
  });
}

// Mock fetch if needed
global.fetch = jest.fn();
