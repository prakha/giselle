import type { AgentId } from "@/services/agents";
import type {
	Node,
	Port,
	PortDirection,
	PortType,
} from "@/services/agents/nodes";
import type {
	PlaygroundEdge,
	PlaygroundGraph,
} from "@/services/agents/playground/types";
import type { RequestId } from "@/services/agents/requests";
import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

import type { VectorStore } from "openai/resources/beta/vector-stores/vector-stores";

export const organizations = pgTable("organizations", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
	id: serial("id").primaryKey(),
	organizationId: integer("organization_id")
		.notNull()
		.references(() => organizations.id),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial("id").primaryKey(),
});
export const userInitialTasks = pgTable("user_initial_tasks", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id),
	taskId: text("task_id").notNull(),
});

export const supabaseUserMappings = pgTable("supabase_user_mappings", {
	userId: integer("user_id")
		.notNull()
		.references(() => users.id),
	supabaseUserId: text("supabase_user_id").notNull(),
});

type TeamRole = "admin" | "member";
export const teamMemberships = pgTable(
	"team_memberships",
	{
		id: serial("id").primaryKey(),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		teamId: integer("team_id")
			.notNull()
			.references(() => teams.id),
		role: text("role").notNull().$type<TeamRole>(),
	},
	(teamMembership) => ({
		teamMembershipsUserTeamUnique: unique().on(
			teamMembership.userId,
			teamMembership.teamId,
		),
	}),
);

export const agents = pgTable("agents", {
	id: text("id").$type<AgentId>().notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	name: text("name"),
	graph: jsonb("graph")
		.$type<PlaygroundGraph>()
		.notNull()
		.default({
			nodes: [],
			edges: [],
			viewport: {
				x: 0,
				y: 0,
				zoom: 1,
			},
		}),
	graphHash: text("graph_hash").unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blueprints = pgTable("blueprints", {
	id: text("id").$type<`blpr_${string}`>().notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	graph: jsonb("graph").$type<PlaygroundGraph>().notNull(),
	graphHash: text("graph_hash").notNull().unique(),
	agentDbId: integer("agent_db_id")
		.notNull()
		.references(() => agents.dbId),
	beforeId: integer("before_id"),
	after: integer("after_id"),
});
export const blueprintRelations = relations(blueprints, ({ one }) => ({
	beforeBlueprint: one(blueprints, {
		fields: [blueprints.beforeId],
		references: [blueprints.id],
	}),
	afterBlueprint: one(blueprints, {
		fields: [blueprints.after],
		references: [blueprints.id],
	}),
}));

export const nodes = pgTable(
	"nodes",
	{
		id: text("id").$type<Node["id"]>().notNull(),
		dbId: serial("db_id").primaryKey(),
		blueprintDbId: integer("blueprint_db_id")
			.notNull()
			.references(() => blueprints.dbId, { onDelete: "cascade" }),
		className: text("class_name").notNull(),
		data: jsonb("data").notNull(),
	},
	(nodes) => ({
		nodesIdBlueprintDbIdUnieque: unique().on(nodes.id, nodes.blueprintDbId),
	}),
);

export const ports = pgTable(
	"ports",
	{
		id: text("id").$type<Port["id"]>().notNull(),
		dbId: serial("db_id").primaryKey(),
		nodeDbId: integer("node_db_id")
			.notNull()
			.references(() => nodes.dbId, { onDelete: "cascade" }),
		name: text("name").notNull(),
		direction: text("direction").$type<PortDirection>().notNull(),
		type: text("type").$type<PortType>().notNull(),
	},
	(ports) => ({
		portsIdNodeDbIdUnique: unique().on(ports.id, ports.nodeDbId),
	}),
);

export const edges = pgTable(
	"edges",
	{
		id: text("id").$type<PlaygroundEdge["id"]>().notNull(),
		dbId: serial("db_id").primaryKey(),
		blueprintDbId: integer("blueprint_db_id")
			.notNull()
			.references(() => blueprints.dbId, { onDelete: "cascade" }),
		targetPortDbId: integer("target_port_db_id")
			.notNull()
			.references(() => ports.dbId, { onDelete: "cascade" }),
		sourcePortDbId: integer("source_port_db_id")
			.notNull()
			.references(() => ports.dbId, { onDelete: "cascade" }),
	},
	(edge) => ({
		edgesInputPortIdOutputPortIdUnique: unique().on(
			edge.targetPortDbId,
			edge.sourcePortDbId,
		),
		edgesIdBlueprintDbIdUnique: unique().on(edge.id, edge.blueprintDbId),
	}),
);

export const steps = pgTable("steps", {
	dbId: serial("db_id").primaryKey(),
	blueprintDbId: integer("blueprint_db_id")
		.notNull()
		.references(() => blueprints.dbId),
	nodeDbId: integer("node_db_id")
		.notNull()
		.references(() => nodes.dbId),
	order: integer("order").notNull(),
});

export type RequestStatus = "creating" | "running" | "success" | "failed";
export const requests = pgTable("requests", {
	id: text("id").$type<RequestId>().notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	blueprintDbId: integer("blueprint_db_id")
		.notNull()
		.references(() => blueprints.dbId),
	status: text("status").$type<RequestStatus>().notNull().default("creating"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	startedAt: timestamp("started_at"),
	finishedAt: timestamp("finished_at"),
});
export const requestRunners = pgTable("request_runners", {
	dbId: serial("db_id").primaryKey(),
	requestDbId: integer("request_db_id")
		.notNull()
		.references(() => requests.dbId),
	provider: text("provider").notNull(),
	runnerId: text("runner_id").notNull().unique(),
});

export const requestResults = pgTable("request_results", {
	dbId: serial("db_id").primaryKey(),
	requestDbId: integer("request_db_id")
		.notNull()
		.references(() => requests.dbId)
		.unique(),
	text: text("text").notNull(),
});

export const requestStacks = pgTable("request_stacks", {
	dbId: serial("db_id").primaryKey(),
	requestDbId: integer("request_db_id")
		.notNull()
		.references(() => requests.dbId),
	startNodeDbId: integer("start_node_db_id")
		.notNull()
		.references(() => nodes.dbId),
	endNodeDbId: integer("end_node_db_id")
		.notNull()
		.references(() => nodes.dbId),
});

export const requestStackRunners = pgTable("request_stack_runners", {
	dbId: serial("db_id").primaryKey(),
	requestStackDbId: integer("request_stack_db_id")
		.notNull()
		.references(() => requestStacks.dbId),
	runnerId: text("runner_id").notNull().unique(),
});

export type RequestStepStatus = "idle" | "running" | "success" | "failed";
export const requestSteps = pgTable("request_steps", {
	id: text("id").$type<`rqst.stp_${string}`>().unique(),
	dbId: serial("db_id").primaryKey(),
	requestStackDbId: integer("request_stack_db_id")
		.notNull()
		.references(() => requestStacks.dbId),
	nodeDbId: integer("node_db_id")
		.notNull()
		.references(() => steps.dbId),
	status: text("status").$type<RequestStepStatus>().notNull().default("idle"),
	startedAt: timestamp("started_at"),
	finishedAt: timestamp("finished_at"),
});
export const requestPortMessages = pgTable(
	"request_port_messages",
	{
		dbId: serial("db_id").primaryKey(),
		requestDbId: integer("request_db_id")
			.notNull()
			.references(() => requests.dbId),
		portDbId: integer("port_db_id")
			.notNull()
			.references(() => ports.dbId),
		message: jsonb("message").notNull(),
	},
	(requestPortMessage) => ({
		requestPortMessagesRequestIdPortIdUnique: unique().on(
			requestPortMessage.requestDbId,
			requestPortMessage.portDbId,
		),
	}),
);

export const requestTriggerRelations = pgTable("request_trigger_relations", {
	dbId: serial("db_id").primaryKey(),
	requestDbId: integer("request_db_id")
		.notNull()
		.references(() => requests.dbId),
	triggerId: text("trigger_id").notNull(),
});

export const oauthCredentials = pgTable(
	"oauth_credentials",
	{
		id: serial("id").primaryKey(),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		provider: text("provider").notNull(),
		providerAccountId: text("provider_account_id").notNull(),
		accessToken: text("access_token").notNull(),
		refreshToken: text("refresh_token"),
		expiresAt: timestamp("expires_at"),
		tokenType: text("token_type"),
		scope: text("scope"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		oauthCredentialsUserIdProviderProviderAccountIdUnique: unique().on(
			table.userId,
			table.provider,
			table.providerAccountId,
		),
	}),
);

// export const knowledges = pgTable("knowledges", {
// 	id: serial("id").primaryKey(),
// 	name: text("name").notNull(),
// 	blueprintId: integer("blueprint_id")
// 		.notNull()
// 		.references(() => blueprints.id, { onDelete: "cascade" }),
// });

// type OpenaiVectorStoreStatus = VectorStore["status"];
// export const knowledgeOpenaiVectorStoreRepresentations = pgTable(
// 	"knowledge_openai_vector_store_representations",
// 	{
// 		id: serial("id").primaryKey(),
// 		knowledgeId: integer("knowledge_id")
// 			.notNull()
// 			.references(() => knowledges.id, { onDelete: "cascade" }),
// 		openaiVectorStoreId: text("openai_vector_store_id").notNull().unique(),
// 		status: text("status").$type<OpenaiVectorStoreStatus>().notNull(),
// 	},
// );
// export const files = pgTable("files", {
// 	id: serial("id").primaryKey(),
// 	fileName: text("file_name").notNull(),
// 	fileType: text("file_type").notNull(),
// 	fileSize: integer("file_size").notNull(),
// 	blobUrl: text("blob_url").notNull(),
// 	createdAt: timestamp("created_at").defaultNow().notNull(),
// });
// export const fileOpenaiFileRepresentations = pgTable(
// 	"file_openai_file_representations",
// 	{
// 		id: serial("id").primaryKey(),
// 		fileId: integer("file_id")
// 			.notNull()
// 			.references(() => files.id, { onDelete: "cascade" }),
// 		openaiFileId: text("openai_file_id").notNull().unique(),
// 	},
// );

// export type KnowledgeContentType = "file" | "text";
// export const knowledgeContents = pgTable(
// 	"knowledge_contents",
// 	{
// 		id: serial("id").primaryKey(),
// 		name: text("name").notNull(),
// 		type: text("knowledge_content_type")
// 			.$type<KnowledgeContentType>()
// 			.notNull(),
// 		knowledgeId: integer("knowledge_id")
// 			.notNull()
// 			.references(() => knowledges.id, { onDelete: "cascade" }),
// 		fileId: integer("file_id")
// 			.notNull()
// 			.references(() => files.id, { onDelete: "cascade" }),
// 	},
// 	(knowledgeContents) => ({
// 		knowledgeContentsKnowledgeIdFileIdUnique: unique().on(
// 			knowledgeContents.fileId,
// 			knowledgeContents.knowledgeId,
// 		),
// 	}),
// );

// export const knowledgeContentOpenaiVectorStoreFileRepresentations = pgTable(
// 	"knowledge_content_openai_vector_store_file_representations",
// 	{
// 		id: serial("id").primaryKey(),
// 		knowledgeContentId: integer("knowledge_content_id")
// 			.notNull()
// 			.references(() => knowledgeContents.id, { onDelete: "cascade" }),
// 		openaiVectorStoreFileId: text("openai_vector_store_file_id").notNull(),
// 	},
// );
