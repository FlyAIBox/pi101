import { createModels, type Api, type Model, type MutableModels } from "@earendil-works/pi-ai";
import { deepseekProvider } from "@earendil-works/pi-ai/providers/deepseek";

export const DEFAULT_MODEL_ID = "deepseek-v4-flash";

export interface ModelRuntime {
	models: MutableModels;
	model: Model<Api>;
}

export function createDeepSeekRuntime(modelId = process.env.PI101_MODEL_ID?.trim() || DEFAULT_MODEL_ID): ModelRuntime {
	const models = createModels();
	models.setProvider(deepseekProvider());

	const model = models.getModel("deepseek", modelId);
	if (model === undefined) {
		const available = models
			.getModels("deepseek")
			.map((candidate) => candidate.id)
			.join(", ");
		throw new Error(`Unknown DeepSeek model ${modelId}. Available models: ${available}`);
	}

	return { models, model };
}
