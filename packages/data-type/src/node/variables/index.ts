import { z } from "zod";
import { NodeBase, NodeReferenceBase } from "../base";
import { FileContent, FileContentReference } from "./file";
import { GitHubContent, GitHubContentReference } from "./github";
import { TextContent, TextContentReference } from "./text";
export * from "./file";
export * from "./text";

const VariableNodeContent = z.discriminatedUnion("type", [
	TextContent,
	FileContent,
	GitHubContent,
]);

export const VariableNode = NodeBase.extend({
	type: z.literal("variable"),
	content: VariableNodeContent,
});
export type VariableNode = z.infer<typeof VariableNode>;

export const TextNode = VariableNode.extend({
	content: TextContent,
});
export type TextNode = z.infer<typeof TextNode>;

export function isTextNode(args: unknown): args is TextNode {
	const result = TextNode.safeParse(args);
	return result.success;
}

export const FileNode = VariableNode.extend({
	content: FileContent,
});
export type FileNode = z.infer<typeof FileNode>;

export function isFileNode(args: unknown): args is FileNode {
	const result = FileNode.safeParse(args);
	return result.success;
}

export const GitHubNode = VariableNode.extend({
	content: GitHubContent,
});
export type GitHubNode = z.infer<typeof GitHubNode>;

export function isGitHubNode(args: unknown): args is GitHubNode {
	const result = GitHubNode.safeParse(args);
	return result.success;
}

const VariableNodeContentReference = z.discriminatedUnion("type", [
	FileContentReference,
	TextContentReference,
	GitHubContentReference,
]);

export const VariableNodeReference = NodeReferenceBase.extend({
	type: VariableNode.shape.type,
	content: VariableNodeContentReference,
});
export type VariableNodeReference = z.infer<typeof VariableNodeReference>;
