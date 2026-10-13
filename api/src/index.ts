import "dotenv/config";
import { productionProblems } from "./lib/config.js";

// in production, refuse to start with a weak or missing secret, an open CORS setting, and so on
const problems = productionProblems();
if (problems.length > 0) {
  console.error("The API will not start in production:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const { app } = await import("./app.js");
const port = Number(process.env.PORT) || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
