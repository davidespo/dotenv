import { ZodError } from "zod";

export const toPrettyZodErrors = (error: ZodError): string[] => {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

export const toPrettyZodError = (error: ZodError): string => {
  return `Zod validation error: ${error.message}\n${toPrettyZodErrors(error).join("\n")}`;
};
