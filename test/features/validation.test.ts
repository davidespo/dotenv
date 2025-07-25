import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import fs from "fs/promises";
import { z } from "zod";
import { Dotenv } from "../../src/Dotenv";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Dotenv Validation Feature", () => {
  beforeEach(() => {
    // Clear process.env
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("TEST_")) {
        delete process.env[key];
      }
    });
  });

  describe("Basic validation", () => {
    it("should validate required string fields", async () => {
      const envContent = `
TEST_REQUIRED=test_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_REQUIRED: z.string(),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.TEST_REQUIRED).toBe("test_value");
    });

    it("should throw error for missing required fields", async () => {
      const envContent = `
TEST_OPTIONAL=optional_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_REQUIRED: z.string(),
        TEST_OPTIONAL: z.string().optional(),
      });

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema,
        })
      ).rejects.toThrow();
    });

    it("should handle optional fields", async () => {
      const envContent = `
TEST_REQUIRED=required_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_REQUIRED: z.string(),
        TEST_OPTIONAL: z.string().optional(),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.TEST_REQUIRED).toBe("required_value");
      expect(config.TEST_OPTIONAL).toBeUndefined();
    });

    it("should handle default values", async () => {
      const envContent = `
TEST_REQUIRED=required_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_REQUIRED: z.string(),
        TEST_DEFAULT: z.string().default("default_value"),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.TEST_REQUIRED).toBe("required_value");
      expect(config.TEST_DEFAULT).toBe("default_value");
    });
  });

  describe("Type validation", () => {
    it("should validate enum values", async () => {
      const envContent = `
TEST_ENV=production
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_ENV: z.enum(["development", "production", "test"]),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.TEST_ENV).toBe("production");
    });

    it("should throw error for invalid enum values", async () => {
      const envContent = `
TEST_ENV=invalid
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_ENV: z.enum(["development", "production", "test"]),
      });

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema,
        })
      ).rejects.toThrow();
    });

    it("should validate URL format", async () => {
      const envContent = `
TEST_URL=https://example.com
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_URL: z.string().url(),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.TEST_URL).toBe("https://example.com");
    });

    it("should throw error for invalid URL", async () => {
      const envContent = `
TEST_URL=not-a-url
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_URL: z.string().url(),
      });

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema,
        })
      ).rejects.toThrow();
    });

    it("should validate string length constraints", async () => {
      const envContent = `
TEST_SHORT=abc
TEST_LONG=this_is_a_very_long_string_that_exceeds_the_minimum_length
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_SHORT: z.string().min(3),
        TEST_LONG: z.string().max(100),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.TEST_SHORT).toBe("abc");
      expect(config.TEST_LONG).toBe("this_is_a_very_long_string_that_exceeds_the_minimum_length");
    });
  });

  describe("Custom validation", () => {
    it("should validate with custom transform functions", async () => {
      const envContent = `
TEST_PORT=3000
TEST_BOOL=true
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_PORT: z.string().transform((val) => {
          const port = parseInt(val, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error("Invalid port number");
          }
          return port;
        }),
        TEST_BOOL: z.string().transform((val) => val === "true"),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.TEST_PORT).toBe(3000);
      expect(config.TEST_BOOL).toBe(true);
    });

    it("should throw error for invalid custom validation", async () => {
      const envContent = `
TEST_PORT=99999
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_PORT: z.string().transform((val) => {
          const port = parseInt(val, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error("Invalid port number");
          }
          return port;
        }),
      });

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema,
        })
      ).rejects.toThrow("Invalid port number");
    });

    it("should validate with custom refine functions", async () => {
      const envContent = `
TEST_SECRET=super-secret-key-123
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_SECRET: z.string().refine((val) => val.length >= 16, {
          message: "Secret must be at least 16 characters long",
        }),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.TEST_SECRET).toBe("super-secret-key-123");
    });

    it("should throw error for failed refine validation", async () => {
      const envContent = `
TEST_SECRET=short
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        TEST_SECRET: z.string().refine((val) => val.length >= 16, {
          message: "Secret must be at least 16 characters long",
        }),
      });

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema,
        })
      ).rejects.toThrow("Secret must be at least 16 characters long");
    });
  });

  describe("Complex validation scenarios", () => {
    it("should validate nested object structures", async () => {
      const envContent = `
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z
        .object({
          DB_HOST: z.string(),
          DB_PORT: z.string().transform(Number),
          DB_NAME: z.string(),
        })
        .transform((data) => ({
          database: {
            host: data.DB_HOST,
            port: data.DB_PORT,
            name: data.DB_NAME,
          },
        }));

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.database).toEqual({
        host: "localhost",
        port: 5432,
        name: "mydb",
      });
    });

    it("should validate with conditional logic", async () => {
      const envContent = `
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z
        .object({
          ENVIRONMENT: z.enum(["development", "production"]),
          DEBUG: z.string().transform((val) => val === "true"),
          LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
        })
        .refine(
          (data) => {
            if (data.ENVIRONMENT === "production" && data.DEBUG) {
              return false;
            }
            return true;
          },
          {
            message: "Debug mode cannot be enabled in production",
          }
        );

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config.ENVIRONMENT).toBe("production");
      expect(config.DEBUG).toBe(false);
      expect(config.LOG_LEVEL).toBe("info");
    });
  });
});
