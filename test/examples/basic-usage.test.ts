import { jest, describe, it, expect } from "@jest/globals";
import fs from "fs/promises";
import { z } from "zod";
import { Dotenv } from "../../src/Dotenv";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Dotenv Examples", () => {
  describe("Basic Usage", () => {
    it("should load a simple .env file", async () => {
      const envContent = `
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=abc123
PORT=3000
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          DATABASE_URL: z.string(),
          API_KEY: z.string(),
          PORT: z.string().transform(Number),
        }),
      });

      expect(config).toEqual({
        DATABASE_URL: "postgresql://localhost:5432/mydb",
        API_KEY: "abc123",
        PORT: 3000,
      });
    });
  });

  describe("Environment Profiles", () => {
    it("should load different environments based on profiles", async () => {
      const baseEnv = `
APP_NAME=MyApp
VERSION=1.0.0
      `;

      const devEnv = `
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=debug
      `;

      mockReadFile.mockResolvedValueOnce(baseEnv).mockResolvedValueOnce(devEnv);

      // Set the profiles environment variable
      process.env.PROFILES = "dev";

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          APP_NAME: z.string(),
          VERSION: z.string(),
          ENVIRONMENT: z.enum(["development", "production"]),
          DEBUG: z.string().transform((val) => val === "true"),
          LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
        }),
      });

      expect(config).toEqual({
        APP_NAME: "MyApp",
        VERSION: "1.0.0",
        ENVIRONMENT: "development",
        DEBUG: true,
        LOG_LEVEL: "debug",
      });
    });
  });

  describe("Custom Logger", () => {
    it("should use custom logger for better debugging", async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const envContent = `
SECRET_KEY=my-secret-key
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          SECRET_KEY: z.string(),
        }),
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Loading environment variables from .env");
      expect(mockLogger.info).toHaveBeenCalledWith("Validating environment variables");
    });
  });

  describe("Complex Validation", () => {
    it("should validate complex environment configurations", async () => {
      const envContent = `
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-key-123-very-long-secret-key
CORS_ORIGINS=http://localhost:3000,https://example.com
ENABLE_FEATURES=feature1,feature2,feature3
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          PORT: z.string().transform((val) => {
            const port = parseInt(val, 10);
            if (isNaN(port) || port < 1 || port > 65535) {
              throw new Error("Invalid port number");
            }
            return port;
          }),
          DATABASE_URL: z.string().url(),
          REDIS_URL: z.string().startsWith("redis://"),
          JWT_SECRET: z.string().min(32),
          CORS_ORIGINS: z.string().transform((val) => val.split(",")),
          ENABLE_FEATURES: z.string().transform((val) => val.split(",")),
        }),
      });

      expect(config).toEqual({
        PORT: 3000,
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "super-secret-key-123-very-long-secret-key",
        CORS_ORIGINS: ["http://localhost:3000", "https://example.com"],
        ENABLE_FEATURES: ["feature1", "feature2", "feature3"],
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required environment variables", async () => {
      const envContent = `
OPTIONAL_VAR=optional_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema: z.object({
            REQUIRED_VAR: z.string(),
            OPTIONAL_VAR: z.string().optional(),
          }),
        })
      ).rejects.toThrow();
    });

    it("should handle invalid environment variable values", async () => {
      const envContent = `
PORT=invalid_port
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema: z.object({
            PORT: z.string().transform((val) => {
              const port = parseInt(val, 10);
              if (isNaN(port) || port < 1 || port > 65535) {
                throw new Error("Invalid port number");
              }
              return port;
            }),
          }),
        })
      ).rejects.toThrow("Invalid port number");
    });
  });
});
