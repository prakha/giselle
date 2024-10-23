import bg from "./bg.png";
import { Header } from "./header";

export function Viewer() {
	return (
		<div
			className="w-full h-screen bg-black-100"
			style={{
				backgroundImage: `url(${bg.src})`,
				backgroundPositionX: "center",
				backgroundPositionY: "center",
				backgroundSize: "cover",
			}}
		>
			<Header />
		</div>
	);
}
