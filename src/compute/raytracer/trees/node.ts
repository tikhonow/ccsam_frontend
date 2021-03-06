import { math } from "../../csg";
import PolygonTreeNode from "./polygon-tree-node";

const { plane } = math;
// # class Node
// Holds a node in a BSP tree. A BSP tree is built from a collection of polygons
// by picking a polygon to split along.
// Polygons are not stored directly in the tree, but in PolygonTreeNodes, stored in
// this.polygontreenodes. Those PolygonTreeNodes are children of the owning
// Tree.polygonTree
// This is not a leafy BSP tree since there is
// no distinction between internal and leaf nodes.

type StackItem = {
  node: Node,
  polygontreenodes: PolygonTreeNode[];
}

export class Node {
  plane!: Float32Array;
  front!: typeof Node;
  back!: typeof Node;
  parent!: Node | undefined;
  polygontreenodes: PolygonTreeNode[];

  constructor(parent?: Node) {
    this.plane;
    this.front;
    this.back;
    this.parent = parent || undefined;
    this.polygontreenodes = [] as PolygonTreeNode[];
  }

  // Convert solid space to empty space and empty space to solid space.
  invert() {
    let queue = [this];
    let node;
    for (let i = 0; i < queue.length; i++) {
      node = queue[i];
      if (node.plane) node.plane = plane.flip(node.plane);
      if (node.front) queue.push(node.front);
      if (node.back) queue.push(node.back);
      let temp = node.front;
      node.front = node.back;
      node.back = temp;
    }
  }

  // clip polygontreenodes to our plane
  // calls remove() for all clipped PolygonTreeNodes
  clipPolygons(polygontreenodes, alsoRemovecoplanarFront) {
    let current: any = { node: this, polygontreenodes: polygontreenodes };
    let node;
    let stack = [] as StackItem[];

    do {
      node = current!.node;
      polygontreenodes = current!.polygontreenodes;

      // begin "function"
      if (node.plane) {
        let backnodes = [] as PolygonTreeNode[];
        let frontnodes = [] as PolygonTreeNode[];
        let coplanarfrontnodes = alsoRemovecoplanarFront ? backnodes : frontnodes;
        let plane = node.plane;
        let numpolygontreenodes = polygontreenodes.length;
        for (let i = 0; i < numpolygontreenodes; i++) {
          let node1 = polygontreenodes[i];
          if (!node1.isRemoved()) {
            node1.splitByPlane(plane, coplanarfrontnodes, backnodes, frontnodes, backnodes);
          }
        }

        if (node.front && frontnodes.length > 0) {
          stack.push({ node: node.front, polygontreenodes: frontnodes });
        }
        let numbacknodes = backnodes.length;
        if (node.back && numbacknodes > 0) {
          stack.push({ node: node.back, polygontreenodes: backnodes });
        } else {
          // there's nothing behind this plane. Delete the nodes behind this plane:
          for (let i = 0; i < numbacknodes; i++) {
            backnodes[i].remove();
          }
        }
      }
      current = stack.pop();
    } while (current !== undefined);
  }

  // Remove all polygons in this BSP tree that are inside the other BSP tree
  // `tree`.
  clipTo({ rootnode }, alsoRemovecoplanarFront) {
    let node: any = this;
    let stack = [] as Array<typeof Node>;
    do {
      if (node.polygontreenodes.length > 0) {
        rootnode.clipPolygons(node.polygontreenodes, alsoRemovecoplanarFront);
      }
      if (node.front) stack.push(node.front);
      if (node.back) stack.push(node.back);
      node = stack.pop();
    } while (node !== undefined);
  }

  addPolygonTreeNodes(newpolygontreenodes) {
    let current: any = { node: this, polygontreenodes: newpolygontreenodes };
    let stack = [] as StackItem[];
    do {
      let node = current.node;
      let polygontreenodes = current.polygontreenodes;

      if (polygontreenodes.length === 0) {
        current = stack.pop();
        continue;
      }
      if (!node.plane) {
        let index = 0; // default
        index = Math.floor(polygontreenodes.length / 2);
        //index = polygontreenodes.length >> 1
        //index = Math.floor(Math.random()*polygontreenodes.length)
        let bestplane = polygontreenodes[index].getPolygon().plane;
        node.plane = bestplane;
      }
      let frontnodes = [] as PolygonTreeNode[];
      let backnodes = [] as PolygonTreeNode[];

      for (let i = 0, n = polygontreenodes.length; i < n; ++i) {
        polygontreenodes[i].splitByPlane(node.plane, node.polygontreenodes, backnodes, frontnodes, backnodes);
      }

      if (frontnodes.length > 0) {
        if (!node.front) node.front = new Node(node);
        stack.push({ node: node.front, polygontreenodes: frontnodes });
      }
      if (backnodes.length > 0) {
        if (!node.back) node.back = new Node(node);
        stack.push({ node: node.back, polygontreenodes: backnodes });
      }

      current = stack.pop();
    } while (current !== undefined);
  }


}

export default Node;
