import {
  booleans,
  bsp,
  connectors,
  expansions,
  extra,
  extrusions,
  geometry,
  hulls,
  math,
  measurements,
  primitives,
  split,
  text,
  transforms
} from "./csg";

const color = extra.color;
const utils = extra.utils;
const splitPolygonByPlane = split.polygonByPlane;
const splitLineByPlane = split.lineSegmentByPlane;
const { Tree, PolygonTreeNode, Node } = bsp;

export {
  // color,
  connectors,
  geometry,
  math,
  primitives,
  text,
  // utils,
  booleans,
  expansions,
  extrusions,
  hulls,
  measurements,
  transforms,
  color,
  utils,
  splitLineByPlane,
  splitPolygonByPlane,
  Tree,
  PolygonTreeNode,
  Node
};

export default {
  // color,
  connectors,
  geometry,
  math,
  primitives,
  text,
  // utils,
  booleans,
  expansions,
  extrusions,
  hulls,
  measurements,
  transforms,
  color,
  utils,
  splitLineByPlane,
  splitPolygonByPlane,
  Tree,
  PolygonTreeNode,
  Node
};
