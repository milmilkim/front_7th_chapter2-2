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
    // FIXME: 왜?
    return null;
  }
  let dom;
  if (vNode.type === TEXT_ELEMENT) {
    dom = document.createTextNode(vNode.props.nodeValue);
  } else if (vNode.type === Fragment) {
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
  } else {
    dom = document.createElement(vNode.type as keyof HTMLElementTagNameMap);
  }

  setDomProps(dom as HTMLElement, vNode.props);

  const children: Instance[] = [];
  const childVNodes = vNode.props.children || [];

  childVNodes.forEach((childVNode, i) => {
    const childPath = createChildPath(path, childVNode.key ?? null, i, childVNode.type, childVNodes);
    const childInstance = createInstance(childVNode, childPath);
    if (childInstance) {
      children.push(childInstance);
      insertInstance(dom as HTMLElement, childInstance);
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

  // 컴포넌트 스택에 현재 경로 추가
  context.hooks.componentStack.push(path);
  context.hooks.visited.add(path);

  // 커서 초기화
  if (!context.hooks.cursor.has(path)) {
    context.hooks.cursor.set(path, 0);
  } else {
    context.hooks.cursor.set(path, 0);
  }

  // 훅 상태 배열 초기화 (없는 경우만)
  if (!context.hooks.state.has(path)) {
    context.hooks.state.set(path, []);
  }

  const childVNode = Component(vNode.props);

  // 컴포넌트 스택에서 제거
  context.hooks.componentStack.pop();

  // 자식에게 고유한 경로 생성
  const childPath = childVNode ? createChildPath(path, childVNode.key ?? null, 0, childVNode.type, [childVNode]) : path;
  const childInstance = createInstance(childVNode!, childPath);

  return {
    kind: NodeTypes.COMPONENT,
    dom: childInstance?.dom ?? null,
    node: vNode,
    children: childInstance ? [childInstance] : [],
    key: vNode.key,
    path,
  };
}
