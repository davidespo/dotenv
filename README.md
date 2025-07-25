# @de44/dotenv

A TypeScript-first environment variable loader with **Zod schema validation**, **multi-line string support**, and **automatic value coercion**.

## 🚀 Why This Library?

Unlike the standard `dotenv` package, this library provides:

- **🔒 Type Safety**: Validate your environment variables with Zod schemas
- **📝 Multi-line Strings**: Support for complex JSON configs and markdown content
- **🎯 TypeScript First**: Built with TypeScript and full type inference
- **⚡ Minimal Dependencies**: Only depends on Zod for validation and lodash for utilities
- **🛡️ Runtime Safety**: Catch configuration errors before your app starts
- **🔄 Value Coercion**: Automatic conversion of strings to appropriate types (JSON, boolean, number, null)
- **📁 Profile Support**: Load environment-specific configurations using the `PROFILES` environment variable

## 📦 Installation

```bash
npm install @de44/dotenv zod lodash
```

## 🎯 Quick Start

### Basic Usage

```typescript
import { Dotenv } from "@de44/dotenv";
import { z } from "zod";

// Define your environment schema
const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(Number),
  NODE_ENV: z.enum(["development", "production"]),
  API_KEY: z.string().min(1),
});

// Load and validate environment variables
const config = await Dotenv.load({
  filepaths: [".env", ".env.local"],
  schema,
});

console.log(config);
// {
//   DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
//   PORT: 3000,
//   NODE_ENV: 'development',
//   API_KEY: 'your-api-key'
// }
```

### Multi-line String Support

This library supports complex multi-line strings for JSON configs, markdown content, and more using triple double quotes (`"""`):

```env
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/db
PORT=3000
NODE_ENV=development

# Multi-line JSON configuration
API_CONFIG="""
{
  "baseUrl": "https://api.example.com",
  "timeout": 5000,
  "retries": 3
}
"""

# Multi-line markdown content
WELCOME_MESSAGE="""
# Welcome to Our App
This is a **markdown** message with:
- Bullet points
- "Quoted text"
- And more content
"""
```

### Environment Profiles

Load different configurations using the `PROFILES` environment variable:

```typescript
// Set PROFILES=dev,test,prod to load .env.dev, .env.test, .env.prod
process.env.PROFILES = "dev,test,prod";

const config = await Dotenv.load({
  filepaths: [".env"], // Base file
  schema,
});
// This will automatically load .env.dev, .env.test, .env.prod in order
// Later profiles override earlier ones
```

### Advanced Configuration

```typescript
import { Dotenv } from "@de44/dotenv";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(Number),
  NODE_ENV: z.enum(["development", "production"]),
  API_CONFIG: z.string().transform((val) => JSON.parse(val)),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
});

// Custom logger
const logger = {
  info: (message: string, ctx?: Record<string, unknown>) => console.log(`[INFO] ${message}`, ctx),
  error: (message: string, ctx?: Record<string, unknown>) => console.error(`[ERROR] ${message}`, ctx),
};

const config = await Dotenv.load({
  filepaths: [".env", ".env.local"],
  schema,
  logger,
  coerceValues: true, // Enable automatic value coercion
});
```

## 🔧 API Reference

### `Dotenv.load<T>(options: LoadOptions<T>): Promise<T>`

Load and validate environment variables.

**Options:**

- `filepaths?: string[]` - Array of .env file paths to load
- `schema: z.ZodSchema<T>` - Zod schema for validation
- `logger?: DotenvLogger` - Optional custom logger
- `coerceValues?: boolean` - Enable automatic value coercion (default: false)

**Returns:** Validated configuration object

### `Dotenv.configure(options: ConfigOptions): Promise<Dotenv>`

Configure and initialize the Dotenv instance.

**Options:**

- `filepaths?: string[]` - Array of .env file paths to load
- `schema?: z.ZodSchema` - Optional Zod schema for validation
- `logger?: DotenvLogger` - Optional custom logger
- `coerceValues?: boolean` - Enable automatic value coercion (default: false)

**Returns:** Dotenv instance

### `dotenv.get<T>(schema: z.ZodSchema<T>): T`

Get validated environment variables from an existing Dotenv instance.

## 🔄 Value Coercion

When `coerceValues: true` is enabled, the library automatically converts string values to appropriate types:

```env
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/db
PORT=3000
DEBUG=true
API_TIMEOUT=5000
RETRY_COUNT=3
CACHE_TTL=null
API_CONFIG={"baseUrl": "https://api.example.com", "timeout": 5000}
```

```typescript
const config = await Dotenv.load({
  filepaths: [".env"],
  schema,
  coerceValues: true,
});

// Values are automatically coerced:
// - Numbers: "3000" → 3000
// - Booleans: "true" → true, "false" → false
// - Null: "null" → null
// - JSON: "{\"key\": \"value\"}" → {key: "value"}
// - Strings: remain as strings
```

## 📝 Multi-line String Format

Multi-line strings must be enclosed in triple double quotes (`"""`):

```env
# ✅ Valid multi-line strings
JSON_CONFIG="""
{
  "key": "value",
  "nested": {
    "data": "content"
  }
}
"""

MESSAGE="""
This is a
multi-line message
with "quotes" inside
"""

# ✅ Valid single-line quoted strings
SINGLE_LINE="This is a single line with quotes"

# ❌ Invalid (no quotes)
INVALID=This won't work
for multi-line content

# ❌ Invalid (single quotes not supported)
INVALID='This also
won\'t work'
```

**Escape Rules:**

- No need to escape quotes inside triple-quoted strings
- Use `\\` for literal backslashes
- Line breaks are preserved as-is
- Single quotes (`"`) are still supported for single-line strings

## 🆚 Comparison with Standard dotenv

| Feature              | Standard dotenv | @de44/dotenv        |
| -------------------- | --------------- | ------------------- |
| TypeScript Support   | ❌              | ✅                  |
| Schema Validation    | ❌              | ✅                  |
| Multi-line Strings   | ❌              | ✅                  |
| Type Safety          | ❌              | ✅                  |
| Runtime Validation   | ❌              | ✅                  |
| Error Messages       | Basic           | Detailed Zod errors |
| Value Coercion       | ❌              | ✅                  |
| Profile Support      | ❌              | ✅                  |
| Minimal Dependencies | ❌              | ✅ (Zod + lodash)   |

## 📚 Examples

Check out the `examples/` directory for more usage examples:

- `examples/basic-usage.ts` - Basic setup and validation
- `examples/multiline-strings.ts` - Multi-line string features
- `examples/env.example` - Sample environment file

## 🤝 Contributing

See [MAINTAINER.md](./MAINTAINER.md) for development setup and contribution guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.
