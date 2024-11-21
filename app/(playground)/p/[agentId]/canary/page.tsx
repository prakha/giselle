import { Editor } from "./components/editor";
import { connections, nodes } from "./mockData";

export default function Page() {
	return <Editor graph={{ nodes, connections }} />;
}
