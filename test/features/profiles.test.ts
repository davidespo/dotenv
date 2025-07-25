import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import fs from "fs/promises";
import { z } from "zod";
import { Dotenv } from "../../src/Dotenv";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Dotenv Profiles Feature", () => {
  beforeEach(() => {
    // Clear process.env
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("TEST_")) {
        delete process.env[key];
      }
    });
  });

  describe("Profile loading", () => {
    it("should load profiles from PROFILES environment variable", async () => {
      process.env.PROFILES = "dev,test";
      mockReadFile.mockResolvedValueOnce("TEST_DEV=dev_value").mockResolvedValueOnce("TEST_TEST=test_value");

      await Dotenv.configure({});

      expect(mockReadFile).toHaveBeenCalledWith(".env.dev", "utf8");
      expect(mockReadFile).toHaveBeenCalledWith(".env.test", "utf8");
      expect(process.env.TEST_DEV).toBe("dev_value");
      expect(process.env.TEST_TEST).toBe("test_value");
    });

    it("should handle single profile", async () => {
      process.env.PROFILES = "production";
      mockReadFile.mockResolvedValueOnce("TEST_PROD=prod_value");

      await Dotenv.configure({});

      expect(mockReadFile).toHaveBeenCalledWith(".env.production", "utf8");
      expect(process.env.TEST_PROD).toBe("prod_value");
    });

    it("should handle profiles with spaces", async () => {
      process.env.PROFILES = " dev , test ";
      mockReadFile.mockResolvedValueOnce("TEST_DEV=dev_value").mockResolvedValueOnce("TEST_TEST=test_value");

      await Dotenv.configure({});

      expect(mockReadFile).toHaveBeenCalledWith(".env.dev", "utf8");
      expect(mockReadFile).toHaveBeenCalledWith(".env.test", "utf8");
    });

    it("should not load profiles when PROFILES is not set", async () => {
      await Dotenv.configure({});

      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("should handle empty PROFILES variable", async () => {
      process.env.PROFILES = "";
      await Dotenv.configure({});

      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("should handle PROFILES variable with only whitespace", async () => {
      process.env.PROFILES = "   ,  , ";
      await Dotenv.configure({});

      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });

  describe("Profile precedence", () => {
    it("should load profiles in order with later profiles overriding earlier ones", async () => {
      process.env.PROFILES = "base,dev,prod";
      mockReadFile
        .mockResolvedValueOnce("TEST_VAR=base_value")
        .mockResolvedValueOnce("TEST_VAR=dev_value")
        .mockResolvedValueOnce("TEST_VAR=prod_value");

      await Dotenv.configure({});

      expect(process.env.TEST_VAR).toBe("prod_value");
    });

    it("should merge variables from multiple profiles", async () => {
      process.env.PROFILES = "base,dev";
      mockReadFile
        .mockResolvedValueOnce("BASE_VAR=base_value\nSHARED_VAR=base_shared")
        .mockResolvedValueOnce("DEV_VAR=dev_value\nSHARED_VAR=dev_shared");

      await Dotenv.configure({});

      expect(process.env.BASE_VAR).toBe("base_value");
      expect(process.env.DEV_VAR).toBe("dev_value");
      expect(process.env.SHARED_VAR).toBe("dev_shared"); // dev overrides base
    });
  });

  describe("Profile validation", () => {
    it("should validate environment variables with profiles", async () => {
      process.env.PROFILES = "dev";
      mockReadFile.mockResolvedValueOnce("TEST_REQUIRED=test_value");

      const schema = z.object({
        TEST_REQUIRED: z.string(),
      });

      const config = await Dotenv.load({
        schema,
      });

      expect(config.TEST_REQUIRED).toBe("test_value");
    });

    it("should handle validation errors with profiles", async () => {
      process.env.PROFILES = "dev";
      mockReadFile.mockResolvedValueOnce("TEST_REQUIRED=test_value");

      const schema = z.object({
        TEST_REQUIRED: z.string(),
        MISSING_REQUIRED: z.string(),
      });

      await expect(Dotenv.load({ schema })).rejects.toThrow();
    });
  });

  describe("Profile with custom filepaths", () => {
    it("should load custom filepaths and then profiles from .env.{profile}", async () => {
      process.env.PROFILES = "dev,test";
      mockReadFile
        .mockResolvedValueOnce("TEST_CUSTOM=custom_value")
        .mockResolvedValueOnce("TEST_DEV=dev_value")
        .mockResolvedValueOnce("TEST_TEST=test_value");

      await Dotenv.configure({
        filepaths: [".env.custom"],
      });

      // Should load custom filepath first
      expect(mockReadFile).toHaveBeenCalledWith(".env.custom", "utf8");
      // Then load profiles from .env.{profile} files
      expect(mockReadFile).toHaveBeenCalledWith(".env.dev", "utf8");
      expect(mockReadFile).toHaveBeenCalledWith(".env.test", "utf8");
    });

    it("should handle multiple custom filepaths and profiles", async () => {
      process.env.PROFILES = "dev";
      mockReadFile
        .mockResolvedValueOnce("TEST_APP=app_value")
        .mockResolvedValueOnce("TEST_DB=db_value")
        .mockResolvedValueOnce("TEST_DEV=dev_value");

      await Dotenv.configure({
        filepaths: [".env.app", ".env.db"],
      });

      // Should load custom filepaths first
      expect(mockReadFile).toHaveBeenCalledWith(".env.app", "utf8");
      expect(mockReadFile).toHaveBeenCalledWith(".env.db", "utf8");
      // Then load profile from .env.{profile} file
      expect(mockReadFile).toHaveBeenCalledWith(".env.dev", "utf8");
    });
  });
});
