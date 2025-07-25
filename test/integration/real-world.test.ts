import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "fs/promises";
import { z } from "zod";
import { Dotenv } from "../../src/Dotenv";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Dotenv Real-world Integration Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env to original state
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original process.env
    process.env = { ...originalEnv };
  });

  describe("Real-world scenarios", () => {
    it("should load and validate a typical .env file", async () => {
      const envContent = `
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=postgres
DB_PASSWORD=secret123

# API configuration
API_KEY=abc123def456
API_URL=https://api.example.com

# Feature flags
ENABLE_CACHE=true
DEBUG_MODE=false
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        DB_HOST: z.string(),
        DB_PORT: z.string().transform(Number),
        DB_NAME: z.string(),
        DB_USER: z.string(),
        DB_PASSWORD: z.string(),
        API_KEY: z.string(),
        API_URL: z.string().url(),
        ENABLE_CACHE: z.string().transform((val) => val === "true"),
        DEBUG_MODE: z.string().transform((val) => val === "true"),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        DB_HOST: "localhost",
        DB_PORT: 5432,
        DB_NAME: "myapp",
        DB_USER: "postgres",
        DB_PASSWORD: "secret123",
        API_KEY: "abc123def456",
        API_URL: "https://api.example.com",
        ENABLE_CACHE: true,
        DEBUG_MODE: false,
      });
    });

    it("should handle multiple environment files with profiles", async () => {
      const baseEnv = `
APP_NAME=MyApp
VERSION=1.0.0
      `;

      const devEnv = `
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=debug
      `;

      const prodEnv = `
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
      `;

      mockReadFile.mockResolvedValueOnce(baseEnv).mockResolvedValueOnce(devEnv).mockResolvedValueOnce(prodEnv);

      // Set profiles environment variable
      process.env.PROFILES = "dev,prod";

      const schema = z.object({
        APP_NAME: z.string(),
        VERSION: z.string(),
        ENVIRONMENT: z.enum(["development", "production"]),
        DEBUG: z.string().transform((val) => val === "true"),
        LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        APP_NAME: "MyApp",
        VERSION: "1.0.0",
        ENVIRONMENT: "production", // Last loaded wins
        DEBUG: false,
        LOG_LEVEL: "info",
      });
    });

    it("should handle missing optional environment variables", async () => {
      const envContent = `
REQUIRED_VAR=required_value
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        REQUIRED_VAR: z.string(),
        OPTIONAL_VAR: z.string().optional(),
        DEFAULT_VAR: z.string().default("default_value"),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        REQUIRED_VAR: "required_value",
        OPTIONAL_VAR: undefined,
        DEFAULT_VAR: "default_value",
      });
    });

    it("should validate environment variables with complex schemas", async () => {
      const envContent = `
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-key-123-very-long-secret-key
CORS_ORIGINS=http://localhost:3000,https://example.com
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
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
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        PORT: 3000,
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "super-secret-key-123-very-long-secret-key",
        CORS_ORIGINS: ["http://localhost:3000", "https://example.com"],
      });
    });

    it("should handle validation errors gracefully", async () => {
      const envContent = `
PORT=invalid_port
DATABASE_URL=not-a-url
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        PORT: z.string().transform((val) => {
          const port = parseInt(val, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error("Invalid port number");
          }
          return port;
        }),
        DATABASE_URL: z.string().url(),
      });

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema,
        })
      ).rejects.toThrow();
    });
  });
});
