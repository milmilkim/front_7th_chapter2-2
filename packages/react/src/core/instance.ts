import { Fragment, NodeTypes, TEXT_ELEMENT } from "./constants";
import { insertInstance, setDomProps } from "./dom";
import { FunctionComponent, Instance, VNode } from "./types";
import { context } from "./context";

export function createInstance(vNode: VNode, path: string): Instance {
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
      const childInstance = createInstance(childVNode, `${path}/${index}`);
      children.push(childInstance);
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
    const childInstance = createInstance(childVNode, `${path}/${i}`);
    children.push(childInstance);
    insertInstance(dom as HTMLElement, childInstance);
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

  const childInstance = createInstance(childVNode!, path);

  return {
    kind: NodeTypes.COMPONENT,
    dom: childInstance?.dom ?? null,
    node: vNode,
    children: childInstance ? [childInstance] : [],
    key: vNode.key,
    path,
  };
}
