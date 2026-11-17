// Entry for the designed error pages (400, 401, 403, 404, 429, 500, 503).
import { errorPage } from "../features/errors/error-page.js";
import Alpine from "../vendor/alpine.js";

Alpine.data("errorPage", errorPage);
