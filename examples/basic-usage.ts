import { Dotenv } from "../src/Dotenv";
import { z } from "zod";

// Define your environment schema
const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(Number),
  NODE_ENV: z.enum(["development", "production"]),
  API_KEY: z.string().min(1),
  DEBUG: z.string().transform((val) => val === "true"),
});

async function main() {
  try {
    // Load and validate environment variables
    const config = await Dotenv.load({
      filepaths: [".env", ".env.local"],
      schema,
    });

    console.log("✅ Environment loaded successfully!");
    console.log("Configuration:", config);

    // Use the validated config
    console.log(`Server will run on port ${config.PORT}`);
    console.log(`Database: ${config.DATABASE_URL}`);
    console.log(`Environment: ${config.NODE_ENV}`);
    console.log(`Debug mode: ${config.DEBUG}`);
  } catch (error) {
    console.error("❌ Failed to load environment:", error);
    process.exit(1);
  }
}

main();
