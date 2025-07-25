import { jest, describe, it, expect } from "@jest/globals";
import fs from "fs/promises";
import { z } from "zod";
import { Dotenv } from "../../src/Dotenv";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Dotenv Advanced Usage Examples", () => {
  describe("Complex Configuration Patterns", () => {
    it("should handle nested configuration objects", async () => {
      const envContent = `
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=secret123
REDIS_HOST=localhost
REDIS_PORT=6379
API_BASE_URL=https://api.example.com
API_TIMEOUT=5000
LOG_LEVEL=info
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z
        .object({
          DB_HOST: z.string(),
          DB_PORT: z.string().transform(Number),
          DB_NAME: z.string(),
          DB_USER: z.string(),
          DB_PASSWORD: z.string(),
          REDIS_HOST: z.string(),
          REDIS_PORT: z.string().transform(Number),
          API_BASE_URL: z.string().url(),
          API_TIMEOUT: z.string().transform(Number),
          LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
        })
        .transform((data) => ({
          database: {
            host: data.DB_HOST,
            port: data.DB_PORT,
            name: data.DB_NAME,
            user: data.DB_USER,
            password: data.DB_PASSWORD,
          },
          redis: {
            host: data.REDIS_HOST,
            port: data.REDIS_PORT,
          },
          api: {
            baseUrl: data.API_BASE_URL,
            timeout: data.API_TIMEOUT,
          },
          logging: {
            level: data.LOG_LEVEL,
          },
        }));

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        database: {
          host: "localhost",
          port: 5432,
          name: "mydb",
          user: "postgres",
          password: "secret123",
        },
        redis: {
          host: "localhost",
          port: 6379,
        },
        api: {
          baseUrl: "https://api.example.com",
          timeout: 5000,
        },
        logging: {
          level: "info",
        },
      });
    });

    it("should handle conditional configuration based on environment", async () => {
      const envContent = `
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
CACHE_TTL=3600
ENABLE_METRICS=true
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z
        .object({
          NODE_ENV: z.enum(["development", "production", "test"]),
          DEBUG: z.string().transform((val) => val === "true"),
          LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
          CACHE_TTL: z.string().transform(Number),
          ENABLE_METRICS: z.string().transform((val) => val === "true"),
        })
        .transform((data) => {
          const isProduction = data.NODE_ENV === "production";
          const isDevelopment = data.NODE_ENV === "development";

          return {
            environment: data.NODE_ENV,
            debug: isDevelopment ? data.DEBUG : false, // Force debug off in production
            logging: {
              level: isProduction ? "warn" : data.LOG_LEVEL, // Force warn level in production
              enableConsole: !isProduction,
              enableFile: isProduction,
            },
            cache: {
              ttl: data.CACHE_TTL,
              enabled: isProduction, // Only enable cache in production
            },
            metrics: {
              enabled: data.ENABLE_METRICS && isProduction, // Only enable metrics in production
              interval: isProduction ? 60000 : 30000, // Different intervals per environment
            },
          };
        });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        environment: "production",
        debug: false,
        logging: {
          level: "warn",
          enableConsole: false,
          enableFile: true,
        },
        cache: {
          ttl: 3600,
          enabled: true,
        },
        metrics: {
          enabled: true,
          interval: 60000,
        },
      });
    });
  });

  describe("Multi-Environment Configuration", () => {
    it("should handle multiple environment files with inheritance", async () => {
      const baseEnv = `
APP_NAME=MyApp
VERSION=1.0.0
DEFAULT_TIMEOUT=30000
      `;

      const devEnv = `
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=debug
TIMEOUT=10000
      `;

      const localEnv = `
DATABASE_URL=postgresql://localhost:5432/dev_db
API_KEY=dev-api-key
      `;

      mockReadFile.mockResolvedValueOnce(baseEnv).mockResolvedValueOnce(devEnv).mockResolvedValueOnce(localEnv);

      // Set profiles environment variable
      process.env.PROFILES = "dev,local";

      const schema = z.object({
        APP_NAME: z.string(),
        VERSION: z.string(),
        ENVIRONMENT: z.enum(["development", "production", "test"]),
        DEBUG: z.string().transform((val) => val === "true"),
        LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
        DEFAULT_TIMEOUT: z.string().transform(Number),
        TIMEOUT: z.string().transform(Number),
        DATABASE_URL: z.string().url(),
        API_KEY: z.string(),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        APP_NAME: "MyApp",
        VERSION: "1.0.0",
        ENVIRONMENT: "development",
        DEBUG: true,
        LOG_LEVEL: "debug",
        DEFAULT_TIMEOUT: 30000,
        TIMEOUT: 10000, // Overrides DEFAULT_TIMEOUT
        DATABASE_URL: "postgresql://localhost:5432/dev_db",
        API_KEY: "dev-api-key",
      });
    });
  });

  describe("Validation with Business Logic", () => {
    it("should validate interdependent configuration values", async () => {
      const envContent = `
ENVIRONMENT=production
ENABLE_SSL=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
PORT=443
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z
        .object({
          ENVIRONMENT: z.enum(["development", "production", "test"]),
          ENABLE_SSL: z.string().transform((val) => val === "true"),
          SSL_CERT_PATH: z.string().optional(),
          SSL_KEY_PATH: z.string().optional(),
          PORT: z.string().transform(Number),
        })
        .refine(
          (data) => {
            // If SSL is enabled, both cert and key paths must be provided
            if (data.ENABLE_SSL) {
              if (!data.SSL_CERT_PATH || !data.SSL_KEY_PATH) {
                return false;
              }
            }
            return true;
          },
          {
            message: "SSL certificate and key paths are required when SSL is enabled",
          }
        )
        .refine(
          (data) => {
            // If SSL is enabled, port should be 443 (HTTPS)
            if (data.ENABLE_SSL && data.PORT !== 443) {
              return false;
            }
            return true;
          },
          {
            message: "Port must be 443 when SSL is enabled",
          }
        );

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        ENVIRONMENT: "production",
        ENABLE_SSL: true,
        SSL_CERT_PATH: "/path/to/cert.pem",
        SSL_KEY_PATH: "/path/to/key.pem",
        PORT: 443,
      });
    });

    it("should handle feature flag validation", async () => {
      const envContent = `
ENABLE_FEATURE_A=true
ENABLE_FEATURE_B=false
FEATURE_A_CONFIG=config_value
FEATURE_B_CONFIG=another_config
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z
        .object({
          ENABLE_FEATURE_A: z.string().transform((val) => val === "true"),
          ENABLE_FEATURE_B: z.string().transform((val) => val === "true"),
          FEATURE_A_CONFIG: z.string().optional(),
          FEATURE_B_CONFIG: z.string().optional(),
        })
        .refine(
          (data) => {
            // If feature A is enabled, its config must be provided
            if (data.ENABLE_FEATURE_A && !data.FEATURE_A_CONFIG) {
              return false;
            }
            return true;
          },
          {
            message: "Feature A configuration is required when feature A is enabled",
          }
        )
        .refine(
          (data) => {
            // If feature B is enabled, its config must be provided
            if (data.ENABLE_FEATURE_B && !data.FEATURE_B_CONFIG) {
              return false;
            }
            return true;
          },
          {
            message: "Feature B configuration is required when feature B is enabled",
          }
        );

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        ENABLE_FEATURE_A: true,
        ENABLE_FEATURE_B: false,
        FEATURE_A_CONFIG: "config_value",
        FEATURE_B_CONFIG: "another_config",
      });
    });
  });

  describe("Custom Transformations", () => {
    it("should handle complex data transformations", async () => {
      const envContent = `
CORS_ORIGINS=http://localhost:3000,https://example.com,https://app.example.com
ALLOWED_IPS=192.168.1.1,10.0.0.1,172.16.0.1
ENABLED_SERVICES=auth,api,websocket,metrics
CONFIG_JSON={"timeout": 5000, "retries": 3, "features": ["a", "b"]}
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const schema = z.object({
        CORS_ORIGINS: z.string().transform((val) => val.split(",").map((origin) => origin.trim())),
        ALLOWED_IPS: z.string().transform((val) => val.split(",").map((ip) => ip.trim())),
        ENABLED_SERVICES: z.string().transform((val) => val.split(",").map((service) => service.trim())),
        CONFIG_JSON: z.string().transform((val) => {
          try {
            return JSON.parse(val);
          } catch {
            throw new Error("Invalid JSON configuration");
          }
        }),
      });

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema,
      });

      expect(config).toEqual({
        CORS_ORIGINS: ["http://localhost:3000", "https://example.com", "https://app.example.com"],
        ALLOWED_IPS: ["192.168.1.1", "10.0.0.1", "172.16.0.1"],
        ENABLED_SERVICES: ["auth", "api", "websocket", "metrics"],
        CONFIG_JSON: {
          timeout: 5000,
          retries: 3,
          features: ["a", "b"],
        },
      });
    });
  });
});
