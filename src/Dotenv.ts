import fs from "fs/promises";
import { z } from "zod";
import { toPrettyZodError } from "./zodUtils";

export type DotenvLogger = {
  info: (message: string, ctx?: Record<string, unknown>) => void;
  error: (message: string, ctx?: Record<string, unknown>) => void;
};

export type ConfigOptions = {
  filepaths?: string[];
  schema?: z.ZodSchema;
  logger?: DotenvLogger;
  coerceValues?: boolean;
};

export type LoadOptions<T> = {
  filepaths?: string[];
  schema: z.ZodSchema<T>;
  logger?: DotenvLogger;
  coerceValues?: boolean;
};

const defaultLogger: DotenvLogger = {
  info: (message: string, ctx?: Record<string, unknown>) => {
    console.log(message, ctx);
  },
  error: (message: string, ctx?: Record<string, unknown>) => {
    console.error(message, ctx);
  },
};

/**
 * A TypeScript-first environment variable loader with Zod schema validation.
 *
 * This class provides methods to load environment variables from .env files,
 * validate them against Zod schemas, and support multi-line strings.
 *
 * @example
 * ```typescript
 * const config = await Dotenv.load({
 *   filepaths: ['.env', '.env.local'],
 *   schema: z.object({
 *     DATABASE_URL: z.string().url(),
 *     PORT: z.string().transform(Number),
 *   }),
 * });
 * ```
 */
export class Dotenv {
  private readonly logger: DotenvLogger;
  private readonly coerceValues: boolean;
  private parsedValues: Record<string, unknown> = {};

  /**
   * Creates a new Dotenv instance.
   * @param options - Configuration options for the Dotenv instance
   */
  private constructor(options: ConfigOptions) {
    this.logger = options.logger ?? defaultLogger;
    this.coerceValues = options.coerceValues ?? false;
  }

  /**
   * Loads environment variables from a single .env file.
   * @param filepath - Path to the .env file to load
   */
  async load(filepath: string) {
    this.logger.info(`Loading environment variables from ${filepath}`);
    try {
      const envFile = await fs.readFile(filepath, "utf8");

      // Parse the environment file content
      const envVars = this.parseEnvFile(envFile);

      // Set environment variables (as strings for process.env)
      for (const [key, value] of Object.entries(envVars)) {
        process.env[key] = String(value);
        this.parsedValues[key] = value;
      }
    } catch (error) {
      this.logger.error(
        `Failed to load environment variables from ${filepath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  private parseEnvFile(content: string): Record<string, unknown> {
    const envVars: Record<string, unknown> = {};
    const lines = content.split("\n");

    let currentKey: string | null = null;
    let currentValue: string[] = [];
    let inMultiline = false;
    let wasMultiline = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith("#")) {
        continue;
      }

      // Skip empty lines, but not when we're in a multi-line string
      if (!trimmedLine && !inMultiline) {
        continue;
      }

      // Check if this line starts a new key-value pair
      const equalsIndex = line.indexOf("=");
      if (equalsIndex !== -1 && !inMultiline) {
        // Save previous key-value pair if exists
        if (currentKey && currentValue.length > 0) {
          const rawValue = wasMultiline
            ? this.unescapeString(currentValue.join("\n"))
            : this.processValue(currentValue.join("\n"));

          envVars[currentKey] = this.coerceValues ? this.coerceValue(rawValue) : rawValue;
        }

        // Start new key-value pair
        currentKey = line.substring(0, equalsIndex).trim();
        const valueStart = line.substring(equalsIndex + 1);

        // Check if value starts with triple double quotes for multi-line strings
        if (valueStart.startsWith('"""')) {
          // This is a multi-line string - remove the opening quotes
          inMultiline = true;
          wasMultiline = true;
          const afterQuotes = valueStart.substring(3);
          currentValue = afterQuotes ? [afterQuotes] : [];
        } else if (valueStart.startsWith('"')) {
          // Check if this is a single-line quoted string
          if (this.hasClosingQuote(valueStart)) {
            currentValue = [valueStart];
            inMultiline = false;
            wasMultiline = false;
          } else {
            // Single quote without closing quote - treat as regular value
            currentValue = [valueStart];
            inMultiline = false;
            wasMultiline = false;
          }
        } else {
          currentValue = [valueStart];
          inMultiline = false;
          wasMultiline = false;
        }
      } else if (inMultiline && currentKey) {
        // Continue multi-line value
        currentValue.push(line);

        // Check if this line ends the multi-line string (triple quotes)
        const lastLine = currentValue[currentValue.length - 1];
        if (this.hasClosingTripleQuotes(lastLine)) {
          // Remove the closing triple quotes from the last line
          const trimmedLastLine = lastLine.substring(0, lastLine.length - 3);
          currentValue[currentValue.length - 1] = trimmedLastLine;
          inMultiline = false;
        }
      } else if (currentKey) {
        // Continue single-line value (indented continuation)
        currentValue.push(line);
      }
    }

    // Save the last key-value pair
    if (currentKey && currentValue.length > 0) {
      const rawValue = wasMultiline
        ? this.unescapeString(currentValue.join("\n"))
        : this.processValue(currentValue.join("\n"));

      envVars[currentKey] = this.coerceValues ? this.coerceValue(rawValue) : rawValue;
    }

    return envVars;
  }

  private processValue(value: string): string {
    // If value is triple-quoted, remove triple quotes and unescape
    if (value.startsWith('"""') && value.endsWith('"""')) {
      const unquoted = value.slice(3, -3);
      return this.unescapeString(unquoted);
    }
    // If value is single-quoted, remove quotes and unescape
    if (value.startsWith('"') && value.endsWith('"')) {
      const unquoted = value.slice(1, -1);
      return this.unescapeString(unquoted);
    }
    return value.trim();
  }

  private coerceValue(value: string): unknown {
    const trimmed = value.trim();

    // Try to parse as JSON first
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // If JSON parsing fails, continue with other coercions
      }
    }

    // Check for boolean values
    if (trimmed.toLowerCase() === "true") {
      return true;
    }
    if (trimmed.toLowerCase() === "false") {
      return false;
    }

    // Check for null
    if (trimmed.toLowerCase() === "null") {
      return null;
    }

    // Check for numbers
    if (!isNaN(Number(trimmed)) && trimmed !== "") {
      const num = Number(trimmed);
      // Check if it's actually a number (not NaN) and not an empty string converted to 0
      if (!isNaN(num) && (trimmed !== "" || num !== 0)) {
        return num;
      }
    }

    // Return as string if no other type matches
    return value;
  }

  private hasClosingQuote(line: string): boolean {
    // Check if line has an unescaped quote at the end (closing quote)
    for (let i = line.length - 1; i >= 0; i--) {
      if (line[i] === '"') {
        // Check if this quote is not escaped
        if (i === 0 || line[i - 1] !== "\\") {
          return true;
        }
      }
    }
    return false;
  }

  private hasClosingTripleQuotes(line: string): boolean {
    // Check if line ends with triple quotes
    return line.trim().endsWith('"""');
  }

  private unescapeString(value: string): string {
    // Replace escaped quotes with regular quotes
    return value.replace(/\\"/g, '"');
  }

  /**
   * Initializes the Dotenv instance by loading files and optionally validating with a schema.
   * @param options - Configuration options for initialization
   */
  async initialize(options: ConfigOptions) {
    if (options.filepaths) {
      for (const filepath of options.filepaths) {
        await this.load(filepath ?? ".env");
      }
    }

    const profiles = process.env.PROFILES?.split(",")
      .map((profile) => profile.trim())
      .filter((profile) => profile.length > 0);
    if (profiles && profiles.length > 0) {
      this.logger.info(`Loading profiles: PROFILES=${profiles.join(",")}`);
      for (const profile of profiles) {
        await this.load(`.env.${profile}`);
      }
    }

    if (options.schema) {
      this.logger.info("Validating environment variables");
      this.get(options.schema);
    }
  }

  /**
   * Validates and returns environment variables using a Zod schema.
   * @param schema - Zod schema to validate environment variables against
   * @returns Validated configuration object
   * @throws Error if validation fails
   */
  get<T>(schema: z.ZodSchema<T>): T {
    // Use parsed values if coercion is enabled, otherwise use process.env for backward compatibility
    const envData = this.coerceValues ? this.parsedValues : process.env;
    const result = schema.safeParse(envData);
    if (!result.success) {
      this.logger.error(toPrettyZodError(result.error), {
        cause: result.error,
        env: envData,
      });
      throw new Error(toPrettyZodError(result.error));
    }
    return result.data;
  }

  /**
   * Creates and configures a Dotenv instance.
   * @param options - Configuration options
   * @returns Configured Dotenv instance
   */
  static async configure(options: ConfigOptions) {
    const dotenv = new Dotenv(options);
    await dotenv.initialize(options);
    return dotenv;
  }

  /**
   * Loads and validates environment variables in one step.
   * @param options - Load options including schema for validation
   * @returns Validated configuration object
   */
  static async load<T>(options: LoadOptions<T>) {
    const dotenv = new Dotenv(options);
    await dotenv.initialize(options);
    return dotenv.get(options.schema);
  }
}
