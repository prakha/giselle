"use server";

import { getOauthCredential } from "@/app/(auth)/lib";
import { getUser } from "@/lib/supabase";
import {
	buildGitHubUserClient,
	needsAuthorization,
} from "@/services/external/github";
import { TriangleAlert } from "lucide-react";
import { GitHubAuthenticationPresentation } from "../components/github-authentication-presentation";
import { GitHubConnectionButton } from "../components/github-connection-button";
import {
	connectGitHubIdentity,
	disconnectGitHubIdentity,
	reconnectGitHubIdentity,
} from "./actions";

const provider = "github";

export async function GitHubAuthentication() {
	const credential = await getOauthCredential(provider);
	if (!credential) {
		return <GitHubAuthenticationPresentation button={GitHubConnectButton} />;
	}

	const gitHubClient = buildGitHubUserClient(credential);
	try {
		const gitHubUser = await gitHubClient.getUser();
		const supabaseUser = await getUser();
		const unlinkable =
			supabaseUser.identities && supabaseUser.identities.length > 1;

		return (
			<GitHubAuthenticationPresentation
				gitHubUser={gitHubUser}
				button={unlinkable ? GitHubDisconnectButton : undefined}
			/>
		);
	} catch (error) {
		if (needsAuthorization(error)) {
			return (
				<GitHubAuthenticationPresentation
					button={GitHubReconnectButton}
					alert="Your GitHub access token has expired or become invalid. Please reconnect to continue using the service."
				/>
			);
		}
		throw error;
	}
}

function GitHubConnectButton() {
	return (
		<GitHubConnectionButton action={connectGitHubIdentity}>
			Connect
		</GitHubConnectionButton>
	);
}

function GitHubReconnectButton() {
	return (
		<div>
			<GitHubConnectionButton
				action={reconnectGitHubIdentity}
				className="text-yellow-500"
			>
				<TriangleAlert /> Reconnect
			</GitHubConnectionButton>
		</div>
	);
}

function GitHubDisconnectButton() {
	return (
		<GitHubConnectionButton
			action={disconnectGitHubIdentity}
			className="text-red-500"
		>
			Disconnect
		</GitHubConnectionButton>
	);
}
