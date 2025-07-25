import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import fs from "fs/promises";
import { z } from "zod";
import { Dotenv, DotenvLogger } from "../../src/Dotenv";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Dotenv Logging Feature", () => {
  let mockLogger: jest.Mocked<DotenvLogger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    // Clear process.env
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("TEST_")) {
        delete process.env[key];
      }
    });
  });

  describe("Custom logger", () => {
    it("should use custom logger when provided", async () => {
      const envContent = `
TEST_KEY=test_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_KEY: z.string(),
        }),
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env");
      expect(mockLogger.info).toHaveBeenCalledWith("Validating environment variables");
    });

    it("should log file loading operations", async () => {
      const envContent = `
TEST_KEY1=value1
TEST_KEY2=value2
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_KEY1: z.string(),
          TEST_KEY2: z.string(),
        }),
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env");
    });

    it("should log validation operations", async () => {
      const envContent = `
TEST_REQUIRED=required_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_REQUIRED: z.string(),
        }),
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Validating environment variables");
    });

    it("should log profile loading operations", async () => {
      process.env.PROFILES = "dev,test";
      mockReadFile.mockResolvedValueOnce("TEST_DEV=dev_value").mockResolvedValueOnce("TEST_TEST=test_value");

      await Dotenv.configure({
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env.dev");
      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env.test");
    });

    it("should log multiple file loading operations", async () => {
      const envContent1 = `
TEST_KEY1=value1
      `;
      const envContent2 = `
TEST_KEY2=value2
      `;

      mockReadFile.mockResolvedValueOnce(envContent1).mockResolvedValueOnce(envContent2);

      await Dotenv.load({
        filepaths: [".env.app", ".env.db"],
        schema: z.object({
          TEST_KEY1: z.string(),
          TEST_KEY2: z.string(),
        }),
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env.app");
      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env.db");
    });
  });

  describe("Error logging", () => {
    it("should log file reading errors", async () => {
      mockReadFile.mockRejectedValueOnce(new Error("File not found"));

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema: z.object({
            TEST_KEY: z.string(),
          }),
          logger: mockLogger,
        })
      ).rejects.toThrow("File not found");

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log validation errors", async () => {
      const envContent = `
TEST_REQUIRED=required_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema: z.object({
            TEST_REQUIRED: z.string(),
            MISSING_REQUIRED: z.string(),
          }),
          logger: mockLogger,
        })
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log profile loading errors", async () => {
      process.env.PROFILES = "dev";
      mockReadFile.mockRejectedValueOnce(new Error("Profile file not found"));

      await expect(
        Dotenv.configure({
          logger: mockLogger,
        })
      ).rejects.toThrow("Profile file not found");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("Default logger", () => {
    it("should use default logger when no custom logger provided", async () => {
      // Temporarily restore console.log to test default logger
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      // Set up a profile to trigger logging
      process.env.PROFILES = "test";
      mockReadFile.mockResolvedValueOnce("TEST_KEY=value");

      await Dotenv.configure({});

      expect(console.log).toHaveBeenCalled();
      console.log = originalConsoleLog;
    });

    it("should use default logger for error logging", async () => {
      // Temporarily restore console.error to test default logger
      const originalConsoleError = console.error;
      console.error = jest.fn();

      mockReadFile.mockRejectedValueOnce(new Error("File not found"));

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema: z.object({
            TEST_KEY: z.string(),
          }),
        })
      ).rejects.toThrow("File not found");

      expect(console.error).toHaveBeenCalled();
      console.error = originalConsoleError;
    });
  });

  describe("Logger interface", () => {
    it("should work with logger that only has info method", async () => {
      const minimalLogger = {
        info: jest.fn(),
        error: jest.fn(), // Add required error method
      };

      const envContent = `
TEST_KEY=test_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_KEY: z.string(),
        }),
        logger: minimalLogger,
      });

      expect(minimalLogger.info).toHaveBeenCalled();
    });

    it("should work with logger that only has error method", async () => {
      const errorOnlyLogger = {
        info: jest.fn(), // Add required info method
        error: jest.fn(),
      };

      mockReadFile.mockRejectedValueOnce(new Error("File not found"));

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema: z.object({
            TEST_KEY: z.string(),
          }),
          logger: errorOnlyLogger,
        })
      ).rejects.toThrow("File not found");

      expect(errorOnlyLogger.error).toHaveBeenCalled();
    });

    it("should handle logger with additional methods", async () => {
      const extendedLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };

      const envContent = `
TEST_KEY=test_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_KEY: z.string(),
        }),
        logger: extendedLogger as DotenvLogger,
      });

      expect(extendedLogger.info).toHaveBeenCalled();
      // Additional methods should not be called
      expect(extendedLogger.warn).not.toHaveBeenCalled();
      expect(extendedLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe("Logging during configuration", () => {
    it("should log during Dotenv.configure()", async () => {
      const envContent = `
TEST_KEY=test_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await Dotenv.configure({
        filepaths: [".env"],
        schema: z.object({
          TEST_KEY: z.string(),
        }),
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env");
      expect(mockLogger.info).toHaveBeenCalledWith("Validating environment variables");
    });

    it("should log during instance load() method", async () => {
      const dotenv = await Dotenv.configure({ logger: mockLogger });

      const envContent = `
TEST_KEY=test_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await dotenv.load(".env");

      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env");
    });
  });
});
