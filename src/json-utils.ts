import { getType } from "./audit/schema";
import { Container, Location, Parsed } from "@xliic/preserving-json-yaml-parser/lib/types";
import { getPreservedLocation } from "@xliic/preserving-json-yaml-parser/lib/preserve";
import { find } from "@xliic/preserving-json-yaml-parser";
import {
  getPointerChild,
  getPointerLastSegment,
  getPointerParent,
  joinJsonPointer,
  parseJsonPointer,
} from "./pointer";

export interface JsonNodeValue {
  value: any;
  pointer: string;
}

export function getRootAsJsonNodeValue(root: Parsed): JsonNodeValue {
  return root ? { value: root, pointer: "" } : null;
}

export function findJsonNodeValue(root: Parsed, pointer: string): JsonNodeValue {
  const value = find(root, pointer);
  return value === undefined ? null : { value: value, pointer: pointer };
}

export function getChildren(node: JsonNodeValue, keepOrder?: boolean): JsonNodeValue[] {
  const children = [];
  for (const key of getKeys(node, keepOrder)) {
    children.push({ value: node.value[key], pointer: getPointerChild(node.pointer, key) });
  }
  return children;
}

export function getDepth(node: JsonNodeValue): number {
  return node.pointer === "" ? 0 : node.pointer.split("/").length - 1;
}

export function getKey(node: JsonNodeValue): string {
  return getPointerLastSegment(node.pointer);
}

export function getValue(node: JsonNodeValue): string {
  return node.value;
}

export function getRawValue(node: JsonNodeValue): string {
  return getValue(node);
}

export function getParent(root: Parsed, node: JsonNodeValue): JsonNodeValue {
  if (node.pointer !== "") {
    const parentPointer = getPointerParent(node.pointer);
    return { value: find(root, parentPointer), pointer: parentPointer };
  }
  return null;
}

export function getRange(root: Parsed, node: JsonNodeValue): [number, number] {
  const myKey = getKey(node);
  const parent = getParent(root, node);
  for (const key of Object.keys(parent.value)) {
    if (key === myKey && node.value === parent.value[key]) {
      const container = parent.value as Container;
      const loc = getPreservedLocation(container, key);
      return [loc.key ? loc.key.start : loc.value.start, loc.value.end];
    }
  }
  return null;
}

export function getKeyRange(root: Parsed, node: JsonNodeValue): [number, number] {
  const myKey = getKey(node);
  const parent = getParent(root, node);
  for (const key of Object.keys(parent.value)) {
    if (key === myKey && node.value === parent.value[key]) {
      const container = parent.value as Container;
      const loc = getPreservedLocation(container, key);
      return [loc.key.start, loc.key.end];
    }
  }
  return null;
}

export function getValueRange(root: Parsed, node: JsonNodeValue): [number, number] {
  const myKey = getKey(node);
  const parent = getParent(root, node);
  for (const key of Object.keys(parent.value)) {
    if (key === myKey && node.value === parent.value[key]) {
      const container = parent.value as Container;
      const loc = getPreservedLocation(container, key);
      return [loc.value.start, loc.value.end];
    }
  }
  return null;
}

export function next(root: Parsed, node: JsonNodeValue): JsonNodeValue {
  const myKey = getKey(node);
  const parent = getParent(root, node);
  const keys = getKeys(parent, true);
  for (let i = 0; i < keys.length - 1; i++) {
    if (myKey === keys[i] && node.value === parent.value[keys[i]]) {
      return {
        value: parent.value[keys[i + 1]],
        pointer: getPointerChild(parent.pointer, keys[i + 1]),
      };
    }
  }
  return null;
}

export function prev(root: Parsed, node: JsonNodeValue): JsonNodeValue {
  const myKey = getKey(node);
  const parent = getParent(root, node);
  const keys = getKeys(parent, true);
  for (let i = 1; i < keys.length; i++) {
    if (myKey === keys[i] && node.value === parent.value[keys[i]]) {
      return {
        value: parent.value[keys[i - 1]],
        pointer: getPointerChild(parent.pointer, keys[i - 1]),
      };
    }
  }
  return null;
}

export function getLastChild(node: JsonNodeValue) {
  const children = getChildren(node, true);
  if (children.length === 0) {
    return null;
  }
  return children[children.length - 1];
}

export function isObject(node: JsonNodeValue): boolean {
  return getType(node.value) === "object";
}

export function isArray(node: JsonNodeValue): boolean {
  return getType(node.value) === "array";
}

export function isScalar(node: JsonNodeValue): boolean {
  return !isObject(node) && !isArray(node);
}

export function getRanges(node: JsonNodeValue): any[] {
  const ranges = [];
  const container = node.value as Container;
  for (const key of getKeys(node, true)) {
    const loc = getPreservedLocation(container, key);
    if (loc.key) {
      ranges.push([loc.key.start, loc.value.end]);
    } else {
      ranges.push([loc.value.start, loc.value.end]);
    }
  }
  return ranges;
}

export function getKeys(node: JsonNodeValue, keepOrder?: boolean): any[] {
  const keys = Object.keys(node.value);
  if (keepOrder && keys.length > 1) {
    keys.sort(comparator(node.value as Container));
  }
  return keys;
}

function comparator(container: Container) {
  return function (key1: string | number, key2: string | number) {
    return (
      getOffset(getPreservedLocation(container, key1)) -
      getOffset(getPreservedLocation(container, key2))
    );
  };
}

function getOffset(location: Location): number {
  return location.key ? location.key.start : location.value.start;
}
