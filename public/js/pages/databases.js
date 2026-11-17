// Entry for /app/databases.
import { registerDatabase } from "../features/databases/register-database.js";
import Alpine from "../vendor/alpine.js";

Alpine.data("registerDatabase", registerDatabase);
