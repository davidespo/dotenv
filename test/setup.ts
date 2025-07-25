// Test setup file
import { jest } from "@jest/globals";

// Mock fs/promises for file operations
jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
}));

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Clear process.env modifications
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("TEST_")) {
      delete process.env[key];
    }
  });
  // Clear any other test-related environment variables
  delete process.env.PROFILES;
});
