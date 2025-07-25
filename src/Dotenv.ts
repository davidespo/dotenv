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
};

export type LoadOptions<T> = {
  filepaths?: string[];
  schema: z.ZodSchema<T>;
  logger?: DotenvLogger;
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

  /**
   * Creates a new Dotenv instance.
   * @param options - Configuration options for the Dotenv instance
   */
  private constructor(options: ConfigOptions) {
    this.logger = options.logger ?? defaultLogger;
  }

  /**
   * Loads environment variables from a single .env file.
   * @param filepath - Path to the .env file to load
   */
  async load(filepath: string) {
    this.logger.info(`Loading environment variables from ${filepath}`);
    const envFile = await fs.readFile(filepath, "utf8");

    // Parse the environment file content
    const envVars = this.parseEnvFile(envFile);

    // Set environment variables
    for (const [key, value] of Object.entries(envVars)) {
      process.env[key] = value;
    }
  }

  private parseEnvFile(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};
    const lines = content.split("\n");

    let currentKey: string | null = null;
    let currentValue: string[] = [];
    let inMultiline = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      // Check if this line starts a new key-value pair
      const equalsIndex = line.indexOf("=");
      if (equalsIndex !== -1 && !inMultiline) {
        // Save previous key-value pair if exists
        if (currentKey && currentValue.length > 0) {
          envVars[currentKey] = this.processValue(currentValue.join("\n"));
        }

        // Start new key-value pair
        currentKey = line.substring(0, equalsIndex).trim();
        const valueStart = line.substring(equalsIndex + 1);

        // Check if value starts with double quotes
        if (valueStart.startsWith('"')) {
          // Check if this is a single-line quoted string
          if (this.hasClosingQuote(valueStart)) {
            currentValue = [valueStart];
            inMultiline = false;
          } else {
            inMultiline = true;
            currentValue = [valueStart];
          }
        } else {
          currentValue = [valueStart];
          inMultiline = false;
        }
      } else if (inMultiline && currentKey) {
        // Continue multi-line value
        currentValue.push(line);

        // Check if this line ends the multi-line string (unescaped quote at end)
        const lastLine = currentValue[currentValue.length - 1];
        if (this.hasClosingQuote(lastLine)) {
          inMultiline = false;
        }
      } else if (currentKey) {
        // Continue single-line value (indented continuation)
        currentValue.push(line);
      }
    }

    // Save the last key-value pair
    if (currentKey && currentValue.length > 0) {
      envVars[currentKey] = this.processValue(currentValue.join("\n"));
    }

    return envVars;
  }

  private processValue(value: string): string {
    // If value is quoted, remove quotes and unescape
    if (value.startsWith('"') && value.endsWith('"')) {
      const unquoted = value.slice(1, -1);
      return this.unescapeString(unquoted);
    }
    return value.trim();
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

    const profiles = process.env.PROFILES?.split(",").map((profile) => profile.trim());
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
    const result = schema.safeParse(process.env);
    if (!result.success) {
      this.logger.error(toPrettyZodError(result.error), {
        cause: result.error,
        env: process.env,
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
