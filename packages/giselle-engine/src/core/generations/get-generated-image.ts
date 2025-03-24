import type { GenerationId } from "@giselle-sdk/data-type";
import type { GiselleEngineContext } from "../types";
import {
	detectImageType,
	getGeneratedImage as getGeneratedImageInternal,
	getGeneration,
} from "./utils";

export async function getGeneratedImage(args: {
	context: GiselleEngineContext;
	generationId: GenerationId;
	filename: string;
}) {
	const generation = await getGeneration({
		storage: args.context.storage,
		generationId: args.generationId,
	});
	if (generation?.status !== "completed") {
		throw new Error(`Generation ${args.generationId} is not completed`);
	}
	const generatedImage = await getGeneratedImageInternal({
		storage: args.context.storage,
		generation,
		filename: args.filename,
	});
	const imageType = detectImageType(generatedImage);
	if (imageType === null) {
		throw new Error("Image type could not be detected");
	}
	return new File([generatedImage], args.filename, {
		type: imageType.contentType,
	});
}
