import { Dotenv } from "../src/Dotenv";
import { z } from "zod";

// Schema that includes multi-line string configurations
const schema = z.object({
  DATABASE_URL: z.string().url(),
  API_CONFIG: z.string().transform((val) => JSON.parse(val)),
  WELCOME_MESSAGE: z.string(),
  EMAIL_TEMPLATE: z.string(),
});

async function main() {
  try {
    const config = await Dotenv.load({
      filepaths: [".env"],
      schema,
    });

    console.log("✅ Multi-line strings loaded successfully!");

    // Access the parsed JSON configuration
    console.log("API Config:", config.API_CONFIG);
    console.log("Base URL:", config.API_CONFIG.baseUrl);
    console.log("Timeout:", config.API_CONFIG.timeout);

    // Access the multi-line welcome message
    console.log("\nWelcome Message:");
    console.log(config.WELCOME_MESSAGE);

    // Access the email template
    console.log("\nEmail Template:");
    console.log(config.EMAIL_TEMPLATE);
  } catch (error) {
    console.error("❌ Failed to load environment:", error);
    process.exit(1);
  }
}

main();
