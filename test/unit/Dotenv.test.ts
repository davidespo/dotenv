import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import fs from "fs/promises";
import { z } from "zod";
import { Dotenv, DotenvLogger } from "../../src/Dotenv";

// Mock fs/promises
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Dotenv", () => {
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

  describe("constructor", () => {
    it("should create instance with default logger when no logger provided", async () => {
      const dotenv = await Dotenv.configure({});
      expect(dotenv).toBeInstanceOf(Dotenv);
    });

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

    it("should create instance with custom logger", async () => {
      const dotenv = await Dotenv.configure({ logger: mockLogger });
      expect(dotenv).toBeInstanceOf(Dotenv);
    });

    it("should load environment files from filepaths", async () => {
      mockReadFile.mockResolvedValueOnce("TEST_KEY1=value1\nTEST_KEY2=value2");

      await Dotenv.configure({
        filepaths: [".env.test"],
        logger: mockLogger,
      });

      expect(mockReadFile).toHaveBeenCalledWith(".env.test", "utf8");
      expect(process.env.TEST_KEY1).toBe("value1");
      expect(process.env.TEST_KEY2).toBe("value2");
    });

    it("should load profiles from PROFILES environment variable", async () => {
      process.env.PROFILES = "dev,test";
      mockReadFile.mockResolvedValueOnce("TEST_DEV=dev_value").mockResolvedValueOnce("TEST_TEST=test_value");

      await Dotenv.configure({ logger: mockLogger });

      expect(mockReadFile).toHaveBeenCalledWith(".env.dev", "utf8");
      expect(mockReadFile).toHaveBeenCalledWith(".env.test", "utf8");
      expect(process.env.TEST_DEV).toBe("dev_value");
      expect(process.env.TEST_TEST).toBe("test_value");
    });

    it("should validate environment variables when schema provided", async () => {
      const schema = z.object({
        TEST_REQUIRED: z.string(),
      });

      process.env.TEST_REQUIRED = "test_value";

      await Dotenv.configure({
        schema,
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Validating environment variables");
    });
  });

  describe("load", () => {
    it("should load environment variables from file", async () => {
      const dotenv = await Dotenv.configure({ logger: mockLogger });
      mockReadFile.mockResolvedValueOnce("TEST_KEY1=value1\nTEST_KEY2=value2");

      await dotenv.load(".env.test");

      expect(mockReadFile).toHaveBeenCalledWith(".env.test", "utf8");
      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env.test");
      expect(process.env.TEST_KEY1).toBe("value1");
      expect(process.env.TEST_KEY2).toBe("value2");
    });

    it("should handle empty lines and comments", async () => {
      const dotenv = await Dotenv.configure({ logger: mockLogger });
      mockReadFile.mockResolvedValueOnce("# This is a comment\n\nTEST_KEY=value\n");

      await dotenv.load(".env.test");

      expect(process.env.TEST_KEY).toBe("value");
    });

    it("should handle malformed lines gracefully", async () => {
      const dotenv = await Dotenv.configure({ logger: mockLogger });
      mockReadFile.mockResolvedValueOnce("MALFORMED_LINE\nTEST_KEY=value");

      await dotenv.load(".env.test");

      expect(process.env.TEST_KEY).toBe("value");
    });
  });

  describe("get", () => {
    it("should return parsed environment variables", async () => {
      const dotenv = await Dotenv.configure({ logger: mockLogger });
      const schema = z.object({
        TEST_KEY: z.string(),
      });

      process.env.TEST_KEY = "test_value";

      const result = dotenv.get(schema);

      expect(result).toEqual({ TEST_KEY: "test_value" });
    });

    it("should throw error when validation fails", async () => {
      const dotenv = await Dotenv.configure({ logger: mockLogger });
      const schema = z.object({
        TEST_REQUIRED: z.string(),
      });

      expect(() => dotenv.get(schema)).toThrow();
    });
  });

  describe("static configure", () => {
    it("should return Dotenv instance", async () => {
      const dotenv = await Dotenv.configure({ logger: mockLogger });
      expect(dotenv).toBeInstanceOf(Dotenv);
    });
  });

  describe("static load", () => {
    it("should load and return validated environment variables", async () => {
      const schema = z.object({
        TEST_KEY: z.string(),
      });

      process.env.TEST_KEY = "test_value";

      const result = await Dotenv.load({
        schema,
        logger: mockLogger,
      });

      expect(result).toEqual({ TEST_KEY: "test_value" });
    });

    it("should load from specified filepaths", async () => {
      const schema = z.object({
        TEST_KEY: z.string(),
      });

      mockReadFile.mockResolvedValueOnce("TEST_KEY=file_value");

      const result = await Dotenv.load({
        filepaths: [".env.test"],
        schema,
        logger: mockLogger,
      });

      expect(mockReadFile).toHaveBeenCalledWith(".env.test", "utf8");
      expect(result).toEqual({ TEST_KEY: "file_value" });
    });
  });

  describe("error handling", () => {
    it("should handle file read errors gracefully", async () => {
      mockReadFile.mockRejectedValueOnce(new Error("File not found"));

      await expect(
        Dotenv.configure({
          filepaths: [".env.missing"],
          logger: mockLogger,
        })
      ).rejects.toThrow("File not found");
    });

    it("should handle validation errors with proper logging", async () => {
      const schema = z.object({
        TEST_REQUIRED: z.string(),
      });

      await expect(
        Dotenv.load({
          schema,
          logger: mockLogger,
        })
      ).rejects.toThrow();
    });
  });
});
