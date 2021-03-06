import { on } from "../messenger";
import { invoke } from "@tauri-apps/api/tauri";


declare global {
  interface EventTypes {
    PRINT_STATE: undefined;
  }
}

export default function registerObjectEvents() {
  on("PRINT_STATE", () => {
    invoke("print_state");
  });
}

