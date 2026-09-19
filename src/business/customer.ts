import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";

const lookupCustomerParameters = Type.Object({
	customerId: Type.String({ description: "CRM customer identifier, for example ACME-042" }),
});

export interface CustomerRecord {
	id: string;
	company: string;
	plan: "starter" | "growth" | "enterprise";
	renewalDate: string;
	monthlyRevenueUsd: number;
	openTickets: number;
	lastContactDaysAgo: number;
	health: "healthy" | "watch" | "at-risk";
}

const customers = new Map<string, CustomerRecord>([
	[
		"ACME-042",
		{
			id: "ACME-042",
			company: "Acme Robotics",
			plan: "enterprise",
			renewalDate: "2026-10-15",
			monthlyRevenueUsd: 18_000,
			openTickets: 4,
			lastContactDaysAgo: 21,
			health: "at-risk",
		},
	],
	[
		"NOVA-017",
		{
			id: "NOVA-017",
			company: "Nova Studio",
			plan: "growth",
			renewalDate: "2027-01-20",
			monthlyRevenueUsd: 2_400,
			openTickets: 0,
			lastContactDaysAgo: 4,
			health: "healthy",
		},
	],
]);

export function findCustomer(customerId: string): CustomerRecord | undefined {
	return customers.get(customerId.toUpperCase());
}

export const lookupCustomerTool: AgentTool<typeof lookupCustomerParameters, CustomerRecord | undefined> = {
	name: "lookup_customer",
	label: "查询客户经营状态",
	description: "从内部 CRM 读取客户套餐、续费、收入、工单、触达间隔和健康度。不得凭空编造客户事实。",
	parameters: lookupCustomerParameters,
	replay: "safe",
	executionMode: "sequential",
	async execute(_toolCallId, params, signal) {
		if (signal?.aborted === true) {
			throw new Error("Customer lookup aborted");
		}

		const record = findCustomer(params.customerId);
		if (record === undefined) {
			return {
				content: [{ type: "text", text: `Customer ${params.customerId} was not found` }],
				details: undefined,
			};
		}

		return {
			content: [{ type: "text", text: JSON.stringify(record) }],
			details: record,
		};
	},
};
