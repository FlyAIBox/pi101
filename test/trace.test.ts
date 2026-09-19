import assert from "node:assert/strict";
import test from "node:test";
import type { AgentEvent } from "@earendil-works/pi-agent-core";
import { eventAttributes } from "../src/trace.js";

const toolStart: AgentEvent = {
	type: "tool_execution_start",
	toolCallId: "call-secret",
	toolName: "lookup_customer",
	args: { customerId: "ACME-042", secret: "do-not-log" },
};

test("trace metadata is redacted by default", () => {
	const attributes = eventAttributes(toolStart);
	assert.equal(attributes.toolName, "lookup_customer");
	assert.equal("args" in attributes, false);
});

test("trace content is opt-in", () => {
	const attributes = eventAttributes(toolStart, true);
	assert.deepEqual(attributes.args, { customerId: "ACME-042", secret: "do-not-log" });
});
