if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL ERROR: JWT_SECRET environment variable is missing in production!");
}

const secretKey = process.env.JWT_SECRET || "default_super_secret_dev_key_change_in_production";
export const JWT_SECRET = new TextEncoder().encode(secretKey);
