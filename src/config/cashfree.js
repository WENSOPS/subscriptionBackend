import { Cashfree, CFEnvironment } from "cashfree-pg";
import dotenv from "dotenv";

dotenv.config();

const { CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_ENV } = process.env;

if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
  throw new Error(
    "Missing Cashfree credentials. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env",
  );
}

const environment =
  CASHFREE_ENV === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

const cashfree = new Cashfree(
  environment,
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
);

export default cashfree;
