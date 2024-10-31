import type { Artifact } from "../artifact/types";
import type { Flow, FlowIndex, Step, StepId } from "./types";

const v2FlowIndexActionTypes = {
	setFlowIndex: "v2.setFlowIndex",
} as const;

type V2FlowIndexActionType =
	(typeof v2FlowIndexActionTypes)[keyof typeof v2FlowIndexActionTypes];

interface SetFlowIndexAction {
	type: Extract<V2FlowIndexActionType, "v2.setFlowIndex">;
	input: SetFlowIndexActionInput;
}
interface SetFlowIndexActionInput {
	flowIndexes: FlowIndex[];
}

export type V2FlowIndexAction = SetFlowIndexAction;

export function isV2FlowIndexAction(
	action: unknown,
): action is V2FlowIndexAction {
	return Object.values(v2FlowIndexActionTypes).includes(
		(action as V2FlowIndexAction).type,
	);
}

export function setFlowIndexes({ input }: { input: SetFlowIndexActionInput }) {
	return {
		type: v2FlowIndexActionTypes.setFlowIndex,
		input,
	};
}

export function v2FlowIndexReducer(
	flowIndexes: FlowIndex[],
	action: V2FlowIndexAction,
): FlowIndex[] {
	switch (action.type) {
		case v2FlowIndexActionTypes.setFlowIndex:
			return action.input.flowIndexes;
	}
	return flowIndexes;
}

const v2FlowActionTypes = {
	setFlow: "v2.setFlow",
	replaceStep: "v2.replaceStep",
	setStepOutput: "v2.setStepOutput",
	addArtifact: "v2.addArtifact",
} as const;

type V2FlowActionType =
	(typeof v2FlowActionTypes)[keyof typeof v2FlowActionTypes];

interface SetFlowAction {
	type: Extract<V2FlowActionType, "v2.setFlow">;
	input: SetFlowActionInput;
}
interface SetFlowActionInput {
	flow: Flow | null | undefined;
}
export function setFlow({ input }: { input: SetFlowActionInput }) {
	return {
		type: v2FlowActionTypes.setFlow,
		input,
	};
}

interface ReplaceFlowActionAction {
	type: Extract<V2FlowActionType, "v2.replaceStep">;
	input: ReplaceFlowActionActionInput;
}
type ReplaceFlowActionActionInput = Step;
export function replaceStep({
	input,
}: {
	input: ReplaceFlowActionActionInput;
}): ReplaceFlowActionAction {
	return {
		type: v2FlowActionTypes.replaceStep,
		input,
	};
}

interface SetStepOutputAction {
	type: Extract<V2FlowActionType, "v2.setStepOutput">;
	input: SetStepOutputActionInput;
}
interface SetStepOutputActionInput {
	stepId: StepId;
	output: unknown;
}
export function setStepOutput({
	input,
}: {
	input: SetStepOutputActionInput;
}): SetStepOutputAction {
	return {
		type: v2FlowActionTypes.setStepOutput,
		input,
	};
}

interface AddArtifactAction {
	type: Extract<V2FlowActionType, "v2.addArtifact">;
	input: AddArtifactActionInput;
}
interface AddArtifactActionInput {
	artifact: Artifact;
}
export function addArtifact({
	input,
}: {
	input: AddArtifactActionInput;
}): AddArtifactAction {
	return {
		type: v2FlowActionTypes.addArtifact,
		input,
	};
}

export type V2FlowAction =
	| SetFlowAction
	| ReplaceFlowActionAction
	| SetStepOutputAction
	| AddArtifactAction;

export function isV2FlowAction(action: unknown): action is V2FlowAction {
	return Object.values(v2FlowActionTypes).includes(
		(action as V2FlowAction).type,
	);
}

export function v2FlowReducer(
	flow: Flow | null | undefined,
	action: V2FlowAction,
): Flow | null | undefined {
	switch (action.type) {
		case v2FlowActionTypes.setFlow:
			return action.input.flow;
		case v2FlowActionTypes.replaceStep:
			if (flow == null) {
				return flow;
			}
			return {
				...flow,
				jobs: flow.jobs.map((actionLayer) => ({
					...actionLayer,
					actions: actionLayer.steps.map((flowAction) =>
						flowAction.id === action.input.id ? action.input : flowAction,
					),
				})),
			};
		case v2FlowActionTypes.addArtifact:
			if (flow == null) {
				return flow;
			}
			return {
				...flow,
				artifacts: [...flow.artifacts, action.input.artifact],
			};
		case v2FlowActionTypes.setStepOutput:
			if (flow == null) {
				return flow;
			}
			return {
				...flow,
				jobs: flow.jobs.map((job) => ({
					...job,
					actions: job.steps.map((step) =>
						step.id === action.input.stepId
							? { ...step, output: action.input.output }
							: step,
					),
				})),
			};
	}
	return flow;
}
