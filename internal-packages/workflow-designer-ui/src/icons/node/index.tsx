import type { Node } from "@giselle-sdk/data-type";
import { getImageGenerationModelProvider } from "@giselle-sdk/language-model";
import type { SVGProps } from "react";
import { AnthropicIcon } from "../anthropic";
import { Flux1Icon } from "../flux1";
import { GitHubIcon } from "../github";
import { GoogleWhiteIcon } from "../google";
import { IdegramIcon } from "../ideogram";
import { OpenaiIcon } from "../openai";
import { PdfFileIcon } from "../pdf-file";
import { PerplexityIcon } from "../perplexity";
import { PictureIcon } from "../picture";
import { PromptIcon } from "../prompt";
import { RecraftIcon } from "../recraft";
import { StableDiffusionIcon } from "../stable-diffusion";
import { TextFileIcon } from "../text-file";
export * from "./file-node";
export * from "./image-generation-node";
export * from "./text-generation-node";

export function NodeIcon({
	node,
	...props
}: { node: Node } & SVGProps<SVGSVGElement>) {
	switch (node.type) {
		case "action": {
			switch (node.content.type) {
				case "textGeneration":
					switch (node.content.llm.provider) {
						case "openai":
							return <OpenaiIcon {...props} />;
						case "anthropic":
							return <AnthropicIcon {...props} />;
						case "google":
							return <GoogleWhiteIcon {...props} />;
						case "perplexity":
							return <PerplexityIcon {...props} />;
						default: {
							const _exhaustiveCheck: never = node.content.llm;
							throw new Error(`Unhandled LLMProvider: ${_exhaustiveCheck}`);
						}
					}
				case "imageGeneration": {
					const imageModelProvider = getImageGenerationModelProvider(
						node.content.llm.id,
					);
					if (imageModelProvider === undefined) {
						return null;
					}
					switch (imageModelProvider) {
						case "flux":
							return <Flux1Icon {...props} data-content-type-icon />;
						case "recraft":
							return <RecraftIcon {...props} data-content-type-icon />;
						case "ideogram":
							return <IdegramIcon {...props} data-content-type-icon />;
						case "stable-diffusion":
							return <StableDiffusionIcon {...props} data-content-type-icon />;
						default: {
							const _exhaustiveCheck: never = imageModelProvider;
							throw new Error(
								`Unhandled ImageModelProvider: ${_exhaustiveCheck}`,
							);
						}
					}
				}
				default: {
					const _exhaustiveCheck: never = node.content;
					throw new Error(`Unhandled node type: ${_exhaustiveCheck}`);
				}
			}
		}
		case "variable":
			switch (node.content.type) {
				case "text":
					return <PromptIcon {...props} />;
				case "file":
					switch (node.content.category) {
						case "pdf":
							return <PdfFileIcon {...props} />;
						case "text":
							return <TextFileIcon {...props} />;
						case "image":
							return <PictureIcon {...props} />;
						default: {
							const _exhaustiveCheck: never = node.content.category;
							throw new Error(`Unhandled node type: ${_exhaustiveCheck}`);
						}
					}
				case "github":
					return <GitHubIcon {...props} />;
				default: {
					const _exhaustiveCheck: never = node.content;
					throw new Error(`Unhandled node type: ${_exhaustiveCheck}`);
				}
			}
		default: {
			const _exhaustiveCheck: never = node;
			throw new Error(`Unhandled node type: ${_exhaustiveCheck}`);
		}
	}
}
