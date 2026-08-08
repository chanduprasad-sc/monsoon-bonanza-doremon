import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MonsoonGame from "../../app/MonsoonGame";
import "../../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MonsoonGame />
  </StrictMode>,
);
