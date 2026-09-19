import assert from "node:assert/strict";
import test from "node:test";
import { findCustomer, lookupCustomerTool } from "../src/business/customer.js";

test("customer lookup is deterministic and case-insensitive", () => {
	assert.equal(findCustomer("acme-042")?.company, "Acme Robotics");
	assert.equal(findCustomer("missing"), undefined);
});

test("customer tool returns structured details", async () => {
	const result = await lookupCustomerTool.execute("call-1", { customerId: "ACME-042" });
	assert.equal(result.details?.health, "at-risk");
	assert.match(result.content[0]?.type === "text" ? result.content[0].text : "", /18000/);
});
