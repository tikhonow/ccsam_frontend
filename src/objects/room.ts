import * as THREE from "three";
import Container, { ContainerProps, ContainerSaveObject, getContainersOfKind } from "./container";
import Surface, { SurfaceSaveObject } from "./surface";

import { UNITS } from "../enums/units";
import { RT_CONSTANTS } from "../constants/rt-constants";
import { third_octave } from "../compute/acoustics";
import { KVP } from "../common/key-value-pair";
import { emit, on } from "../messenger";
import { addContainer, removeContainer, setContainerProperty } from "../store";
import { renderer } from "../render/renderer";

export interface RoomProps extends ContainerProps {
  surfaces: (Surface | Container)[];
  // surfaceEdges: Surface[];
  originalFileName?: string;
  originalFileData?: string;
  units?: UNITS;
  purpose?: string,
  description?: string

}

enum PorpuseEnum {
  None,
  Small,
  Auditory
}

export interface RoomSaveObject {
  kind: string;
  surfaces: SurfaceSaveObject[];
  originalFileName: string;
  originalFileData: string;
  units: UNITS;
  uuid: string;
  name: string;
  visible: boolean;
  position: number[];
  rotation: number[];
  scale: number[];
  purpose: string;
  description: string;
}

export class Room extends Container {
  boundingBox!: THREE.Box3;
  surfaces!: Container;
  volume!: number;
  purpose!: string;
  description!: string;
  units!: UNITS;
  originalFileName!: string;
  originalFileData!: string;
  surfaceMap!: KVP<Surface>;

  constructor(name?: string, props?: RoomProps) {
    super(name || "new room");
    this.kind = "room";
    props && this.init(props, true);
  }

  get _surfaces() {
    const surfaces = [] as Surface[];
    this.surfaces.traverse((container) => {
      if (container["kind"] && container["kind"] === "surface") {
        surfaces.push(container as Surface);
      }
    });
    return surfaces;
  }

  get brief() {
    return {
      uuid: this.uuid,
      name: this.name,
      selected: this.selected,
      //@ts-ignore
      children: this._surfaces.map((x) => x.brief),
      kind: this.kind
    };
  }

  static from(saveObject: RoomSaveObject) {
    const room = new Room(saveObject.name).restore(saveObject);
    return room;
  }

  init(props: RoomProps, fromConstructor: boolean = false) {
    if (!fromConstructor) {
      this.remove(this.surfaces);
    }
    this.purpose = props.purpose || "None";
    this.description = props.description || "";
    this.surfaces = new Container("surfaces");
    this.originalFileName = props.originalFileName || "";
    this.originalFileData = props.originalFileData || "";
    this.units = props.units || UNITS.METERS;
    props.surfaces.forEach((surface) => {
      if (surface["kind"] === "surface") {
        emit("ADD_SURFACE", surface as Surface);
      }
      surface.traverse((obj) => {
        if (obj["kind"] && obj["kind"] === "surface") {
          emit("ADD_SURFACE", obj as Surface);
        }
      });
      this.surfaces.add(surface);
    });
    this.add(this.surfaces);
    this.calculateBoundingBox();
    this.volume = this.volumeOfMesh();
    this.surfaceMap = this._surfaces.reduce((a, b) => {
      a[b.uuid] = b as Surface;
      return a;
    }, {} as KVP<Surface>);
    renderer.add(this);
  }

  dispose() {
    renderer.remove(this);
    this._surfaces.forEach(surface => {
      emit("REMOVE_SURFACE", surface.uuid);
    });
  }

  save() {
    return {
      surfaces: this.surfaces.children.map((surf: Surface) => surf.save()),
      kind: this.kind,
      name: this.name,
      uuid: this.uuid,
      units: this.units,
      originalFileData: this.originalFileData,
      originalFileName: this.originalFileName,
      visible: this.visible,
      position: this.position.toArray(),
      rotation: this.rotation.toArray().slice(0, 3),
      scale: this.scale.toArray(),
      purpose: this.purpose,
      description: this.description
    } as RoomSaveObject;
  }

  restore(state: RoomSaveObject) {
    function mapSurfaces(saveObj: SurfaceSaveObject | ContainerSaveObject) {
      if (saveObj.kind === "surface") {
        return new Surface(saveObj.name).restore(saveObj as SurfaceSaveObject);
      } else {
        const container = new Container(saveObj.name).restore(saveObj as ContainerSaveObject);
        (saveObj as ContainerSaveObject).children?.forEach(child => {
          container.add(mapSurfaces(child));
        });
        return container;
      }
    }

    this.init({
      ...state,
      surfaces: state.surfaces.map((surfaceState) => mapSurfaces(surfaceState))
    });
    this.visible = state.visible;
    this.position.set(state.position[0], state.position[1], state.position[2]);
    this.rotation.set(state.rotation[0], state.rotation[1], state.rotation[2], "XYZ");
    this.scale.set(state.scale[0], state.scale[1], state.scale[2]);
    this.uuid = state.uuid;
    return this;
  }

  select() {
    this.surfaces.select();
  }

  deselect() {
    this.surfaces.deselect();
  }

  calculateBoundingBox() {
    this.boundingBox = this._surfaces.reduce((a: THREE.Box3, b: Container) => {
      (b as Surface).geometry.computeBoundingBox();
      return (a as THREE.Box3).union((b as Surface).geometry.boundingBox);
    }, new THREE.Box3());
    return this.boundingBox;
  }

  signedVolumeOfTriangle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) {
    return p1.dot(p2.clone().cross(p3)) / 6.0;
  }

  volumeOfMesh() {
    let sum = 0;
    this._surfaces.forEach((surface: Surface) => {
      surface._triangles.forEach((triangle: THREE.Triangle) => {
        sum += this.signedVolumeOfTriangle(triangle.a, triangle.b, triangle.c);
      });
    });
    return Math.abs(sum);
  }

  calculateMeanAbsorptionCoefficientFromHits(frequencies: number[] = third_octave) {
    let totalHits = 0;
    const ha = [] as number[][];
    for (let i = 0; i < this._surfaces.length; i++) {
      const numHits = (this._surfaces[i] as Surface).numHits;
      totalHits += numHits;
      ha.push(frequencies.map((freq) => (this._surfaces[i] as Surface).absorptionFunction(freq) * numHits));
    }
    if (totalHits > 0) {
      console.log(ha);
      const meanAbsorption = [] as number[];
      for (let i = 0; i < frequencies.length; i++) {
        let sum = 0;
        for (let j = 0; j < ha.length; j++) {
          sum += ha[j][i];
        }
        meanAbsorption.push(sum / totalHits);
      }
      return {
        meanAbsorption,
        totalHits
      };
    } else {
      return {
        meanAbsorption: Array(ha[0].length).fill(0),
        totalHits: 0
      };
    }
  }

  calculateRT60FromHits(frequencies: number[] = third_octave) {
    this.volume = this.volumeOfMesh();
    const unitsConstant = RT_CONSTANTS[this.units] || RT_CONSTANTS[UNITS.METERS];
    const { totalHits, meanAbsorption } = this.calculateMeanAbsorptionCoefficientFromHits(frequencies);
    const totalSurfaceArea = this._surfaces.reduce((a, b) => a + (b as Surface).getArea(), 0);
    if (totalHits > 0) {
      const t60 = meanAbsorption.map((alpha) => {
        return (unitsConstant * this.volume) / (alpha * totalSurfaceArea);
        // return (unitsConstant * this.volume) / (-totalHits * Math.log(1 - alpha));
      });
      return [frequencies, t60];
    } else {
      return [frequencies, meanAbsorption];
    }
  }
}


// this allows for nice type checking with 'on' and 'emit' from messenger
declare global {
  interface EventTypes {
    ADD_ROOM: Room | undefined;
    ROOM_SET_PROPERTY: SetPropertyPayload<Room>;
    REMOVE_ROOM: string;
  }
}

on("ADD_ROOM", addContainer(Room));
on("REMOVE_ROOM", removeContainer);
on("ROOM_SET_PROPERTY", setContainerProperty);


export const getRooms = () => getContainersOfKind<Room>("room");

export default Room;
