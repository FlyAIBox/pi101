import assert from "node:assert/strict";
import test from "node:test";
import { parseTrace, summarizeTrace } from "../src/trace-summary.js";

test("trace summary counts tools and assistant usage once", () => {
	const entries = parseTrace(
		[
			{
				timestamp: "2026-09-18T00:00:00.000Z",
				elapsedMs: 10,
				event: "message_end",
				attributes: {
					message: {
						role: "assistant",
						provider: "deepseek",
						model: "deepseek-v4-flash",
						usage: {
							input: 100,
							output: 20,
							cacheRead: 60,
							cacheWrite: 0,
							totalTokens: 120,
							cost: { total: 0.001 },
						},
					},
				},
			},
			{
				timestamp: "2026-09-18T00:00:00.100Z",
				elapsedMs: 110,
				event: "tool_execution_end",
				attributes: { toolName: "lookup_customer", isError: false },
			},
		]
			.map((entry) => JSON.stringify(entry))
			.join("\n"),
	);

	const summary = summarizeTrace(entries);
	assert.equal(summary.durationMs, 110);
	assert.deepEqual(summary.models, ["deepseek/deepseek-v4-flash"]);
	assert.deepEqual(summary.tools.lookup_customer, { calls: 1, errors: 0 });
	assert.equal(summary.usage.totalTokens, 120);
	assert.equal(summary.usage.costUsd, 0.001);
});
