import type { Metadata } from "next";
import MonsoonGame from "./MonsoonGame";

export const metadata: Metadata = {
  title: "Doremon Jump",
  description: "Jump, collect eligible baskets, and climb the Runs leaderboard.",
};

export default function Home() {
  return <MonsoonGame />;
}
