import { emit, on } from "../messenger";
import { omit } from "../common/helpers";
import { getSolverKeys, useSolver } from "../store";
import RayTracer, { RayTracerSaveObject } from "./raytracer";
import RT60, { RT60SaveObject } from "./rt";
import Solver from "./solver";
import ImageSourceSolver, { ImageSourceSaveObject } from "./raytracer/image-source";

declare global {
  interface EventTypes {
    RESTORE_SOLVERS: (RayTracerSaveObject | RT60SaveObject | ImageSourceSaveObject)[];
    REMOVE_SOLVERS: string | string[];
    LOG_SOLVER: string;
  }
}

export default function registerSolverEvents() {


  on("LOG_SOLVER", uuid => {
    console.log(useSolver.getState().solvers[uuid]);
  });

  on("REMOVE_SOLVERS", (uuids) => {
    const solvers = useSolver.getState().solvers;
    const ids = typeof uuids === "string" ? [uuids] : uuids;
    ids.forEach(id => solvers[id].dispose());
    useSolver.getState().set((state) => {
      state.solvers = omit(ids, solvers);
    });
  });

  const restore = <SolverType extends Solver>(
    constructor: new (args: any) => SolverType,
    saveObject: any
  ) => {
    return new constructor(saveObject).restore(saveObject);
  };

  on("RESTORE_SOLVERS", solvers => {
    emit("REMOVE_SOLVERS", getSolverKeys());

    console.log(solvers);
    //postMessage("SHOULD_ADD_RAYTRACER")
    if (solvers.length !== 0) {
      solvers.forEach((solver) => {
        switch (solver.kind) {
          case "ray-tracer":
            emit("ADD_RAYTRACER", restore(RayTracer, solver));
            break;
          case "rt60":
            emit("ADD_RT60", restore(RT60, solver));
            break;
          case "image-source":
            const s = new ImageSourceSolver(solver).restore(solver);
            useSolver.getState().set(draft => {
              draft.solvers[s!.uuid] = s;
            });
            // emit("ADD_IMAGESOURCE", restore(ImageSourceSolver, solver));
            break;
        }
      });
    } else {
      //postMessage("SHOULD_ADD_RAYTRACER");

    }
  });

}
