import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import fs from "fs/promises";
import { z } from "zod";
import { Dotenv } from "../src/Dotenv";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Dotenv Data Type Parsing", () => {
  beforeEach(() => {
    // Clear process.env
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("TEST_")) {
        delete process.env[key];
      }
    });
  });

  describe("Integer Numbers", () => {
    it("should parse positive integers", async () => {
      const envContent = `
TEST_INT=42
TEST_NEGATIVE_INT=-123
TEST_ZERO=0
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_INT: z.string().transform((val) => parseInt(val, 10)),
          TEST_NEGATIVE_INT: z.string().transform((val) => parseInt(val, 10)),
          TEST_ZERO: z.string().transform((val) => parseInt(val, 10)),
        }),
      });

      expect(config).toEqual({
        TEST_INT: 42,
        TEST_NEGATIVE_INT: -123,
        TEST_ZERO: 0,
      });
    });

    it("should handle invalid integers gracefully", async () => {
      const envContent = `
TEST_INVALID_INT=not_a_number
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema: z.object({
            TEST_INVALID_INT: z.string().transform((val) => {
              const parsed = parseInt(val, 10);
              if (isNaN(parsed)) {
                throw new Error("Invalid integer");
              }
              return parsed;
            }),
          }),
        })
      ).rejects.toThrow("Invalid integer");
    });
  });

  describe("Decimal Numbers", () => {
    it("should parse decimal numbers", async () => {
      const envContent = `
TEST_PI=3.141592
TEST_NEGATIVE_DECIMAL=-2.718
TEST_ZERO_DECIMAL=0.0
TEST_SCIENTIFIC=1.23e-4
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_PI: z.string().transform((val) => parseFloat(val)),
          TEST_NEGATIVE_DECIMAL: z.string().transform((val) => parseFloat(val)),
          TEST_ZERO_DECIMAL: z.string().transform((val) => parseFloat(val)),
          TEST_SCIENTIFIC: z.string().transform((val) => parseFloat(val)),
        }),
      });

      expect(config).toEqual({
        TEST_PI: 3.141592,
        TEST_NEGATIVE_DECIMAL: -2.718,
        TEST_ZERO_DECIMAL: 0.0,
        TEST_SCIENTIFIC: 1.23e-4,
      });
    });

    it("should handle invalid decimals gracefully", async () => {
      const envContent = `
TEST_INVALID_DECIMAL=not_a_decimal
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      await expect(
        Dotenv.load({
          filepaths: [".env"],
          schema: z.object({
            TEST_INVALID_DECIMAL: z.string().transform((val) => {
              const parsed = parseFloat(val);
              if (isNaN(parsed)) {
                throw new Error("Invalid decimal");
              }
              return parsed;
            }),
          }),
        })
      ).rejects.toThrow("Invalid decimal");
    });
  });

  describe("Boolean Values", () => {
    it("should parse boolean values", async () => {
      const envContent = `
TEST_TRUE=true
TEST_FALSE=false
TEST_TRUE_UPPER=TRUE
TEST_FALSE_UPPER=FALSE
TEST_ONE=1
TEST_ZERO=0
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_TRUE: z.string().transform((val) => val.toLowerCase() === "true" || val === "1"),
          TEST_FALSE: z.string().transform((val) => val.toLowerCase() === "true" || val === "1"),
          TEST_TRUE_UPPER: z.string().transform((val) => val.toLowerCase() === "true" || val === "1"),
          TEST_FALSE_UPPER: z.string().transform((val) => val.toLowerCase() === "true" || val === "1"),
          TEST_ONE: z.string().transform((val) => val.toLowerCase() === "true" || val === "1"),
          TEST_ZERO: z.string().transform((val) => val.toLowerCase() === "true" || val === "1"),
        }),
      });

      expect(config).toEqual({
        TEST_TRUE: true,
        TEST_FALSE: false,
        TEST_TRUE_UPPER: true,
        TEST_FALSE_UPPER: false,
        TEST_ONE: true,
        TEST_ZERO: false,
      });
    });

    it("should handle custom boolean parsing", async () => {
      const envContent = `
TEST_YES=yes
TEST_NO=no
TEST_ENABLED=enabled
TEST_DISABLED=disabled
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_YES: z.string().transform((val) => ["yes", "true", "1", "enabled"].includes(val.toLowerCase())),
          TEST_NO: z.string().transform((val) => ["yes", "true", "1", "enabled"].includes(val.toLowerCase())),
          TEST_ENABLED: z.string().transform((val) => ["yes", "true", "1", "enabled"].includes(val.toLowerCase())),
          TEST_DISABLED: z.string().transform((val) => ["yes", "true", "1", "enabled"].includes(val.toLowerCase())),
        }),
      });

      expect(config).toEqual({
        TEST_YES: true,
        TEST_NO: false,
        TEST_ENABLED: true,
        TEST_DISABLED: false,
      });
    });
  });

  describe("Multi-line Strings", () => {
    it("should parse multi-line JSON strings", async () => {
      const envContent = `
TEST_JSON="{
	"message": "Hello, World!",
	"timestamp": "2024-01-01T00:00:00Z",
	"data": {
		"key": "value",
		"array": [1, 2, 3]
	}
}"
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_JSON: z.string().transform((val) => JSON.parse(val)),
        }),
      });

      expect(config.TEST_JSON).toEqual({
        message: "Hello, World!",
        timestamp: "2024-01-01T00:00:00Z",
        data: {
          key: "value",
          array: [1, 2, 3],
        },
      });
    });

    it("should parse multi-line configuration strings", async () => {
      const envContent = `
TEST_CONFIG="
server {
    port 3000;
    host localhost;
    
    routes {
        /api {
            handler api;
        }
    }
}"
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_CONFIG: z.string(),
        }),
      });

      expect(config.TEST_CONFIG).toContain("server {");
      expect(config.TEST_CONFIG).toContain("port 3000;");
      expect(config.TEST_CONFIG).toContain("host localhost;");
      expect(config.TEST_CONFIG).toContain("routes {");
    });

    it("should parse multi-line strings with single quotes", async () => {
      const envContent = `
TEST_SQL='SELECT 
    id,
    name,
    email
FROM users
WHERE active = true
ORDER BY created_at DESC;'
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_SQL: z.string(),
        }),
      });

      expect(config.TEST_SQL).toContain("SELECT");
      expect(config.TEST_SQL).toContain("id,");
      expect(config.TEST_SQL).toContain("name,");
      expect(config.TEST_SQL).toContain("email");
      expect(config.TEST_SQL).toContain("FROM users");
    });

    it("should handle multi-line strings with escaped quotes", async () => {
      const envContent = `
TEST_ESCAPED="This is a \"quoted\" string
with multiple lines
and \"more\" quotes"
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_ESCAPED: z.string(),
        }),
      });

      expect(config.TEST_ESCAPED).toContain('This is a "quoted" string');
      expect(config.TEST_ESCAPED).toContain("with multiple lines");
      expect(config.TEST_ESCAPED).toContain('and "more" quotes');
    });
  });

  describe("Complex Data Types", () => {
    it("should parse mixed data types in one file", async () => {
      const envContent = `
# Database configuration
DB_PORT=5432
DB_TIMEOUT=30.5
DB_SSL=true

# API configuration
API_RETRY_COUNT=3
API_TIMEOUT=5000.0
API_ENABLED=false

# JSON configuration
API_CONFIG="{
	"baseUrl": "https://api.example.com",
	"headers": {
		"Authorization": "Bearer token",
		"Content-Type": "application/json"
	},
	"timeout": 5000
}"

# Multi-line configuration
LOG_FORMAT="
timestamp: {timestamp}
level: {level}
message: {message}
"
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          DB_PORT: z.string().transform((val) => parseInt(val, 10)),
          DB_TIMEOUT: z.string().transform((val) => parseFloat(val)),
          DB_SSL: z.string().transform((val) => val.toLowerCase() === "true"),
          API_RETRY_COUNT: z.string().transform((val) => parseInt(val, 10)),
          API_TIMEOUT: z.string().transform((val) => parseFloat(val)),
          API_ENABLED: z.string().transform((val) => val.toLowerCase() === "true"),
          API_CONFIG: z.string().transform((val) => JSON.parse(val)),
          LOG_FORMAT: z.string(),
        }),
      });

      expect(config).toEqual({
        DB_PORT: 5432,
        DB_TIMEOUT: 30.5,
        DB_SSL: true,
        API_RETRY_COUNT: 3,
        API_TIMEOUT: 5000.0,
        API_ENABLED: false,
        API_CONFIG: {
          baseUrl: "https://api.example.com",
          headers: {
            Authorization: "Bearer token",
            "Content-Type": "application/json",
          },
          timeout: 5000,
        },
        LOG_FORMAT: expect.stringContaining("timestamp: {timestamp}"),
      });
    });

    it("should handle arrays and objects with mixed types", async () => {
      const envContent = `
FEATURES="feature1,feature2,feature3"
PORTS="3000,3001,3002"
ENABLED_FEATURES="true,false,true"
COMPLEX_CONFIG="{
	\"numbers\": [1, 2, 3.14, -5],
	\"strings\": [\"hello\", \"world\"],
	\"booleans\": [true, false, true],
	\"mixed\": [42, \"text\", true, 3.14]
}"
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          FEATURES: z.string().transform((val) => val.split(",")),
          PORTS: z.string().transform((val) => val.split(",").map((v) => parseInt(v, 10))),
          ENABLED_FEATURES: z.string().transform((val) => val.split(",").map((v) => v.toLowerCase() === "true")),
          COMPLEX_CONFIG: z.string().transform((val) => JSON.parse(val)),
        }),
      });

      expect(config).toEqual({
        FEATURES: ["feature1", "feature2", "feature3"],
        PORTS: [3000, 3001, 3002],
        ENABLED_FEATURES: [true, false, true],
        COMPLEX_CONFIG: {
          numbers: [1, 2, 3.14, -5],
          strings: ["hello", "world"],
          booleans: [true, false, true],
          mixed: [42, "text", true, 3.14],
        },
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty multi-line strings", async () => {
      const envContent = `
TEST_EMPTY=""
TEST_EMPTY_MULTILINE="

"
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_EMPTY: z.string(),
          TEST_EMPTY_MULTILINE: z.string(),
        }),
      });

      expect(config.TEST_EMPTY).toBe("");
      expect(config.TEST_EMPTY_MULTILINE).toBe("\n");
    });

    it("should handle values with equals signs", async () => {
      const envContent = `
TEST_EQUALS=key=value
TEST_MULTIPLE_EQUALS=a=b=c=d
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_EQUALS: z.string(),
          TEST_MULTIPLE_EQUALS: z.string(),
        }),
      });

      expect(config.TEST_EQUALS).toBe("key=value");
      expect(config.TEST_MULTIPLE_EQUALS).toBe("a=b=c=d");
    });

    it("should handle values with quotes in the middle", async () => {
      const envContent = `
TEST_QUOTES=This has "quotes" in the middle
TEST_QUOTES_MULTILINE="This has
"quotes" in the middle
of multiple lines"
      `;

      mockReadFile.mockResolvedValueOnce(envContent);

      const config = await Dotenv.load({
        filepaths: [".env"],
        schema: z.object({
          TEST_QUOTES: z.string(),
          TEST_QUOTES_MULTILINE: z.string(),
        }),
      });

      expect(config.TEST_QUOTES).toBe('This has "quotes" in the middle');
      expect(config.TEST_QUOTES_MULTILINE).toContain("This has");
      expect(config.TEST_QUOTES_MULTILINE).toContain('"quotes" in the middle');
    });
  });
});
