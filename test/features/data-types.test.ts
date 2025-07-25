import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { Dotenv } from "../../src/Dotenv";
import { z } from "zod";
import fs from "fs/promises";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("Data Type Coercion", () => {
  beforeEach(() => {
    // Clear process.env
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("TEST_")) {
        delete process.env[key];
      }
    });
  });

  it("should coerce numbers correctly", async () => {
    const envContent = `
# Test environment variables with different data types
PORT=3000
ZERO_VALUE=0
NEGATIVE_NUMBER=-42
FLOAT_NUMBER=3.14
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      PORT: z.number(),
      ZERO_VALUE: z.number(),
      NEGATIVE_NUMBER: z.number(),
      FLOAT_NUMBER: z.number(),
    });

    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
      coerceValues: true,
    });

    expect(config.PORT).toBe(3000);
    expect(config.ZERO_VALUE).toBe(0);
    expect(config.NEGATIVE_NUMBER).toBe(-42);
    expect(config.FLOAT_NUMBER).toBe(3.14);
  });

  it("should coerce booleans correctly", async () => {
    const envContent = `
DEBUG=true
ENABLED=false
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      DEBUG: z.boolean(),
      ENABLED: z.boolean(),
    });

    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
      coerceValues: true,
    });

    expect(config.DEBUG).toBe(true);
    expect(config.ENABLED).toBe(false);
  });

  it("should handle null values", async () => {
    const envContent = `
NULL_VALUE=null
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      NULL_VALUE: z.null(),
    });

    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
      coerceValues: true,
    });

    expect(config.NULL_VALUE).toBe(null);
  });

  it("should parse JSON objects correctly", async () => {
    const envContent = `
JSON_OBJECT={"name":"test","value":123}
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      JSON_OBJECT: z.object({
        name: z.string(),
        value: z.number(),
      }),
    });

    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
      coerceValues: true,
    });

    expect(config.JSON_OBJECT).toEqual({
      name: "test",
      value: 123,
    });
  });

  it("should parse JSON arrays correctly", async () => {
    const envContent = `
JSON_ARRAY=[1,2,3,"test"]
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      JSON_ARRAY: z.array(z.union([z.number(), z.string()])),
    });

    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
      coerceValues: true,
    });

    expect(config.JSON_ARRAY).toEqual([1, 2, 3, "test"]);
  });

  it("should handle multiline JSON correctly", async () => {
    const envContent = `
MULTILINE_JSON="""
{
  "nested": {
    "value": "test"
  }
}
"""
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      MULTILINE_JSON: z.object({
        nested: z.object({
          value: z.string(),
        }),
      }),
    });

    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
      coerceValues: true,
    });

    expect(config.MULTILINE_JSON).toEqual({
      nested: {
        value: "test",
      },
    });
  });

  it("should preserve strings when no coercion is possible", async () => {
    const envContent = `
STRING_VALUE="hello world"
QUOTED_STRING="quoted string"
EMPTY_STRING=""
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      STRING_VALUE: z.string(),
      QUOTED_STRING: z.string(),
      EMPTY_STRING: z.string(),
    });

    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
      coerceValues: true,
    });

    expect(config.STRING_VALUE).toBe("hello world");
    expect(config.QUOTED_STRING).toBe("quoted string");
    expect(config.EMPTY_STRING).toBe("");
  });

  it("should handle mixed data types in the same schema", async () => {
    const envContent = `
PORT=3000
DEBUG=true
JSON_OBJECT={"name":"test","value":123}
STRING_VALUE="hello world"
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      PORT: z.number(),
      DEBUG: z.boolean(),
      JSON_OBJECT: z.record(z.string(), z.unknown()),
      STRING_VALUE: z.string(),
    });

    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
      coerceValues: true,
    });

    expect(config.PORT).toBe(3000);
    expect(config.DEBUG).toBe(true);
    expect(config.JSON_OBJECT).toEqual({
      name: "test",
      value: 123,
    });
    expect(config.STRING_VALUE).toBe("hello world");
  });

  it("should fail validation for invalid JSON", async () => {
    const envContent = `
INVALID_JSON={"name": "test",}
`;

    mockReadFile.mockResolvedValueOnce(envContent);

    const schema = z.object({
      INVALID_JSON: z.record(z.string(), z.unknown()),
    });

    await expect(
      Dotenv.load({
        filepaths: [".env"],
        schema,
        coerceValues: true,
      })
    ).rejects.toThrow();
  });
});
