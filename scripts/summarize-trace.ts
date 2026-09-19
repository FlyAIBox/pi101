import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseTrace, summarizeTrace } from "../src/trace-summary.js";

const input = process.argv[2];
if (input === undefined) {
	throw new Error("Usage: npm run trace:summary -- artifacts/agent-trace-<timestamp>.jsonl");
}

const path = resolve(input);
const entries = parseTrace(await readFile(path, "utf8"));
console.log(JSON.stringify({ path, ...summarizeTrace(entries) }, null, 2));
