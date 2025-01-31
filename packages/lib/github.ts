"use server";

import { db, type githubIntegrationSettings } from "@/drizzle";
import { getGitHubIdentityState } from "@/services/accounts";
import type { components } from "@octokit/openapi-types";

export async function getGitHubIntegrationState(
	agentDbId: number,
): Promise<GitHubIntegrationState> {
	const identityState = await getGitHubIdentityState();
	if (
		identityState.state === "unauthorized" ||
		identityState.state === "invalid-credential" // FIXME: Add invalid credential state handling
	) {
		return {
			status: "unauthorized",
		};
	}
	const gitHubUserClient = identityState.gitHubUserClient;

	const { installations } = await gitHubUserClient.getInstallations();
	if (installations.length === 0) {
		return {
			status: "not-installed",
		};
	}

	const [repositories, githubIntegrationSetting] = await Promise.all([
		Promise.all(
			installations.map(async (installation) => {
				const { repositories: repos } = await gitHubUserClient.getRepositories(
					installation.id,
				);
				return repos;
			}),
		).then((repos) =>
			repos.flat().sort((a, b) => a.name.localeCompare(b.name)),
		),
		db.query.githubIntegrationSettings.findFirst({
			where: (githubIntegrationSettings, { eq }) =>
				eq(githubIntegrationSettings.agentDbId, agentDbId),
		}),
	]);
	return {
		status: "installed",
		repositories,
		setting: githubIntegrationSetting,
	};
}

type Repository = components["schemas"]["repository"];
export type GitHubIntegrationState = (
	| GitHubIntegrationStateUnauthorized
	| GitHubIntegrationStateNotInstalled
	| GitHubIntegrationStateInstalled
) &
	GitHubIntegrationSettingState;

export type GitHubIntegrationStateUnauthorized = {
	status: "unauthorized";
};

export type GitHubIntegrationStateNotInstalled = {
	status: "not-installed";
};

export type GitHubIntegrationStateInstalled = {
	status: "installed";
	repositories: Repository[];
};

export type GitHubIntegrationSettingState = {
	setting?: GitHubIntegrationSetting;
};

export type GitHubIntegrationSetting = Omit<
	typeof githubIntegrationSettings.$inferSelect,
	"dbId" | "agentDbId"
>;

interface CreateGitHubIntegrationSettingSuccess {
	result: "success";
	setting: GitHubIntegrationSetting;
}
interface CreateGitHubIntegrationSettingError {
	result: "error";
	message: string;
}
export type CreateGitHubIntegrationSettingResult =
	| CreateGitHubIntegrationSettingSuccess
	| CreateGitHubIntegrationSettingError;
