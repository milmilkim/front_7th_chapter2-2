import { Fragment, NodeTypes, TEXT_ELEMENT } from "./constants";
import { insertInstance, setDomProps } from "./dom";
import { FunctionComponent, Instance, VNode } from "./types";
import { context } from "./context";
import { createChildPath } from "./elements";

export function createInstance(vNode: VNode, path: string): Instance | null {
  console.log("createInstance", vNode);
  // 함수형 컴포넌트
  if (typeof vNode.type === "function") {
    return createFunctionalInstance(vNode, path);
  }

  // Host 요소 (HTML 태그)
  return createHostInstance(vNode, path);
}

function createHostInstance(vNode: VNode, path: string): Instance | null {
  if (!vNode) {
    return null;
  }

  if (vNode.type === TEXT_ELEMENT) {
    const dom = document.createTextNode(vNode.props.nodeValue ?? "");
    return {
      kind: NodeTypes.TEXT,
      dom,
      node: vNode,
      children: [],
      key: vNode.key,
      path,
    };
  }

  if (vNode.type === Fragment) {
    const children: Instance[] = [];
    const rawChildren = vNode.props.children || [];

    rawChildren.forEach((childVNode, index) => {
      const childPath = createChildPath(path, childVNode.key ?? null, index, childVNode.type, rawChildren);
      const childInstance = createInstance(childVNode, childPath);
      if (childInstance) {
        children.push(childInstance);
      }
    });

    return {
      kind: NodeTypes.FRAGMENT,
      dom: null,
      node: vNode,
      children,
      key: vNode.key,
      path,
    };
  }

  const dom = document.createElement(vNode.type as keyof HTMLElementTagNameMap);
  setDomProps(dom, vNode.props);

  const children: Instance[] = [];
  const childVNodes = vNode.props.children || [];

  childVNodes.forEach((childVNode, i) => {
    const childPath = createChildPath(path, childVNode.key ?? null, i, childVNode.type, childVNodes);
    const childInstance = createInstance(childVNode, childPath);
    if (childInstance) {
      children.push(childInstance);
      insertInstance(dom, childInstance);
    }
  });

  return {
    kind: NodeTypes.HOST,
    dom,
    node: vNode,
    children,
    key: vNode.key,
    path,
  };
}

function createFunctionalInstance(vNode: VNode, path: string): Instance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = vNode.type as FunctionComponent<any>;

  // push stack
  context.hooks.componentStack.push(path);
  context.hooks.visited.add(path);

  // reset cursor
  context.hooks.cursor.set(path, 0);

  // init hook state
  if (!context.hooks.state.has(path)) {
    context.hooks.state.set(path, []);
  }

  const raw = Component(vNode.props);

  context.hooks.componentStack.pop();

  if (!raw) {
    return {
      kind: NodeTypes.COMPONENT,
      dom: null,
      node: vNode,
      children: [],
      key: vNode.key,
      path,
    };
  }

  const childPath = createChildPath(path, raw.key ?? null, 0, raw.type, [raw]);
  const childInstance = createInstance(raw, childPath);

  return {
    kind: NodeTypes.COMPONENT,
    dom: childInstance?.dom ?? null,
    node: vNode,
    children: childInstance ? [childInstance] : [],
    key: vNode.key,
    path,
  };
}
