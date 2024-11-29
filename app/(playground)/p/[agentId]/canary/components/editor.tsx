"use client";

import {
	Background,
	BackgroundVariant,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
	useUpdateNodeInternals,
} from "@xyflow/react";
import bg from "./bg.png";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import { GraphContextProvider, useGraph } from "../contexts/graph";
import {
	MousePositionProvider,
	useMousePosition,
} from "../contexts/mouse-position";
import {
	PropertiesPanelProvider,
	usePropertiesPanel,
} from "../contexts/properties-panel";
import { ToolbarContextProvider, useToolbar } from "../contexts/toolbar";
import type { Graph, NodeId, Position, Tool } from "../types";
import { createNodeId } from "../utils";
import { Edge } from "./edge";
import { Node, PreviewNode, getNodePreviewContent } from "./node";
import { PropertiesPanel } from "./properties-panel";
import { Toolbar } from "./toolbar";

interface EditorProps {
	graph: Graph;
}
export function Editor(props: EditorProps) {
	return (
		<GraphContextProvider defaultGraph={props.graph}>
			<PropertiesPanelProvider>
				<ReactFlowProvider>
					<ToolbarContextProvider>
						<MousePositionProvider>
							<EditorInner />
						</MousePositionProvider>
					</ToolbarContextProvider>
				</ReactFlowProvider>
			</PropertiesPanelProvider>
		</GraphContextProvider>
	);
}
const nodeTypes = {
	giselleNode: Node,
};
const edgeTypes = {
	giselleEdge: Edge,
};
function EditorInner() {
	const { graph, dispatch } = useGraph();
	const { tool, setOpen, setTool, open } = useToolbar();
	const reactFlowInstance = useReactFlow<Node, Edge>();
	const updateNodeInternals = useUpdateNodeInternals();
	useEffect(() => {
		const currentNodes = reactFlowInstance.getNodes();
		reactFlowInstance.setNodes(
			graph.nodes.map((node) => {
				const currentNode = currentNodes.find(
					(currentNode) => currentNode.id === node.id,
				);
				return {
					...currentNode,
					id: node.id,
					type: "giselleNode",
					position: node.position,
					selected: node.selected,
					selectable: !open,
					draggable: !open,
					data: {
						node,
					},
				} as Node;
			}),
		);
		updateNodeInternals(graph.nodes.map((node) => node.id));
	}, [
		graph.nodes,
		reactFlowInstance.getNodes,
		reactFlowInstance.setNodes,
		updateNodeInternals,
		open,
	]);

	useEffect(() => {
		reactFlowInstance.setEdges(
			graph.connections.map(
				(connection) =>
					({
						id: connection.id,
						type: "giselleEdge",
						source: connection.sourceNodeId,
						target: connection.targetNodeId,
						targetHandle: connection.targetNodeHandleId,
						selectable: !open,
						deletable: !open,
						data: {
							connection,
						},
					}) satisfies Edge,
			),
		);
	}, [graph.connections, reactFlowInstance.setEdges, open]);
	const { setTab } = usePropertiesPanel();
	return (
		<div className="w-full h-screen">
			<ReactFlow<Node, Edge>
				colorMode="dark"
				defaultNodes={[]}
				defaultEdges={[]}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				onNodesChange={(nodesChange) => {
					nodesChange.map((nodeChange) => {
						switch (nodeChange.type) {
							case "select": {
								const node = graph.nodes.find(
									(node) => node.id === nodeChange.id,
								);
								if (node === undefined) {
									return;
								}
								// selectNode(node.id, nodeChange.selected);
								dispatch({
									type: "updateNodeSelection",
									input: {
										nodeId: node.id,
										selected: nodeChange.selected,
									},
								});
								if (nodeChange.selected) {
									switch (node.content.type) {
										case "textGeneration":
											setTab("Prompt");
											break;
										case "text":
											setTab("Text");
											break;
										case "file":
											setTab("File");
											break;
										default:
											break;
									}
								}
								break;
							}
							case "remove": {
								console.log(nodeChange);
								break;
							}
						}
					});
				}}
				onEdgesChange={(edgesChange) => {
					edgesChange.map((edgeChange) => {
						if (edgeChange.type === "remove") {
							console.log(edgeChange);
						}
					});
				}}
				onNodeDragStop={(_event, _node, nodes) => {
					nodes.map((node) => {
						dispatch({
							type: "updateNodePosition",
							input: {
								nodeId: node.id as NodeId,
								position: node.position,
							},
						});
					});
				}}
			>
				<Background
					className="!bg-black-100"
					lineWidth={0}
					variant={BackgroundVariant.Lines}
					style={{
						backgroundImage: `url(${bg.src})`,
						backgroundPositionX: "center",
						backgroundPositionY: "center",
						backgroundSize: "cover",
					}}
				/>
				<Panel position="top-right" className="!top-0 !bottom-0 !right-0 !m-0">
					<PropertiesPanel />
				</Panel>
				<Panel position={"bottom-center"}>
					<Toolbar />
				</Panel>
			</ReactFlow>
			{tool !== undefined && (
				<FloatingNodePreview
					tool={tool}
					onPlaceNode={(position) => {
						switch (tool) {
							case "addTextNode":
								dispatch({
									type: "addNode",
									input: {
										node: {
											id: createNodeId(),
											name: `Untitle node - ${graph.nodes.length + 1}`,
											position,
											selected: false,
											type: "variable",
											content: {
												type: "text",
												text: "",
											},
										},
									},
								});
								break;
							case "addFileNode":
								dispatch({
									type: "addNode",
									input: {
										node: {
											id: createNodeId(),
											name: `Untitle node - ${graph.nodes.length + 1}`,
											position,
											selected: false,
											type: "variable",
											content: {
												type: "file",
											},
										},
									},
								});
								break;
						}
						setTool(undefined);
						setOpen(false);
					}}
				/>
			)}
		</div>
	);
}

const FloatingNodePreview = ({
	tool,
	onPlaceNode,
}: {
	tool: Tool;
	onPlaceNode: (position: Position) => void;
}) => {
	const mousePosition = useMousePosition();

	return (
		<>
			<div
				className="fixed inset-0 cursor-crosshair pointer-events-auto"
				onMouseDown={(event) => {
					onPlaceNode({
						x: mousePosition.x,
						y: mousePosition.y,
					});
				}}
			/>
			<div
				className="fixed pointer-events-none inset-0"
				style={{
					transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
				}}
			>
				<div className="w-[180px]">
					<PreviewNode tool={tool} />
				</div>
			</div>
		</>
	);
};
