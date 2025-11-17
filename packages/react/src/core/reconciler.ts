import { NodeTypes } from "./constants";
import { FunctionComponent, Instance, VNode } from "./types";
import { getFirstDomFromChildren, insertInstance, removeInstance, updateDomProps } from "./dom";
import { createInstance } from "./instance";
import { context } from "./context";
import { createChildPath } from "./elements";

/**
 * 이전 인스턴스와 새로운 VNode를 비교하여 DOM을 업데이트하는 재조정 과정을 수행합니다.
 *
 * @param parentDom - 부모 DOM 요소
 * @param instance - 이전 렌더링의 인스턴스
 * @param node - 새로운 VNode
 * @param path - 현재 노드의 고유 경로
 * @returns 업데이트되거나 새로 생성된 인스턴스
 */
export const reconcile = (
  parentDom: HTMLElement,
  instance: Instance | null,
  node: VNode | null,
  path: string,
): Instance | null => {
  console.log("reconcile called", {
    instancePath: instance?.path,
    newPath: path,
    nodeType: node?.type,
    instanceType: instance?.node.type,
  });

  // 1. 새 노드가 null이면 기존 인스턴스를 제거합니다. (unmount)
  if (node === null) {
    if (instance) {
      removeInstance(parentDom, instance);
    }
    return null;
  }

  // 2. 기존 인스턴스가 없으면 새 노드를 마운트합니다. (mount)
  if (instance === null) {
    const newInstance = createInstance(node, path);
    insertInstance(parentDom, newInstance);
    return newInstance;
  }

  // 3. 타입이나 키가 다르면 기존 인스턴스를 제거하고 새로 마운트합니다.
  if (instance.node.type !== node.type || instance.key !== node.key) {
    console.log("REPLACE: type or key changed", {
      instanceType: instance.node.type,
      nodeType: node.type,
      instanceKey: instance.key,
      nodeKey: node.key,
      instancePath: instance.path,
      newPath: path,
    });
    removeInstance(parentDom, instance);
    const newInstance = createInstance(node, path);
    insertInstance(parentDom, newInstance);
    return newInstance;
  }

  // 4. 타입과 키가 같으면 인스턴스를 업데이트합니다. (update)
  const oldNode = instance.node;
  instance.node = node;

  if (instance.kind === NodeTypes.HOST) {
    // DOM 요소: 속성 업데이트
    if (instance.dom && instance.dom instanceof HTMLElement) {
      updateDomProps(instance.dom, oldNode.props, node.props);
    }
    // 자식들 재조정
    reconcileChildren(instance.dom as HTMLElement, instance, node.props.children || []);
  } else if (instance.kind === NodeTypes.TEXT) {
    // 텍스트 노드: 내용 업데이트
    if (instance.dom && instance.dom instanceof Text) {
      const newText = node.props.nodeValue || "";
      console.log("TEXT update", { old: instance.dom.nodeValue, new: newText });
      if (instance.dom.nodeValue !== newText) {
        instance.dom.nodeValue = newText;
        console.log("TEXT updated to", newText);
      }
    }
  } else if (instance.kind === NodeTypes.COMPONENT) {
    // 함수형 컴포넌트: 컴포넌트 재실행
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Component = node.type as FunctionComponent<any>;

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

    const childVNode = Component(node.props);

    // 컴포넌트 스택에서 제거
    context.hooks.componentStack.pop();

    if (childVNode) {
      const oldChild = instance.children[0] || null;
      // 자식에게 고유한 경로 생성
      const childPath = createChildPath(path, childVNode.key ?? null, 0, childVNode.type, [childVNode]);
      console.log("COMPONENT child reconcile", {
        componentPath: path,
        childPath,
        oldChildPath: oldChild?.path,
        childVNodeType: childVNode.type,
      });
      const newChild = reconcile(parentDom, oldChild, childVNode, childPath);
      instance.children = newChild ? [newChild] : [];
      instance.dom = newChild?.dom || null;
    } else {
      // 컴포넌트가 null을 반환하면 자식 제거
      if (instance.children[0]) {
        removeInstance(parentDom, instance.children[0]);
      }
      instance.children = [];
      instance.dom = null;
    }
  } else if (instance.kind === NodeTypes.FRAGMENT) {
    // Fragment: 자식들만 재조정
    reconcileChildren(parentDom, instance, node.props.children || []);
  }

  return instance;
};

/**
 * 자식 인스턴스들을 재조정합니다.
 */
function reconcileChildren(parentDom: HTMLElement, parentInstance: Instance, newChildren: VNode[]): void {
  const oldChildren = parentInstance.children;
  const maxLength = Math.max(oldChildren.length, newChildren.length);

  const updatedChildren: (Instance | null)[] = [];

  for (let i = 0; i < maxLength; i++) {
    const oldChild = oldChildren[i] || null;
    const newChild = newChildren[i] || null;
    const childPath = createChildPath(parentInstance.path, newChild?.key ?? null, i, newChild?.type, newChildren);

    // 다음 형제 노드를 anchor로 사용 (삽입 위치 보장)
    const anchor = getFirstDomFromChildren(oldChildren.slice(i + 1));

    const updatedChild = reconcile(parentDom, oldChild, newChild, childPath);

    // 새로운 인스턴스가 생성되었고, anchor가 있으면 올바른 위치에 삽입
    if (updatedChild && updatedChild !== oldChild && anchor) {
      removeInstance(parentDom, updatedChild);
      insertInstance(parentDom, updatedChild, anchor);
    }

    updatedChildren.push(updatedChild);
  }

  parentInstance.children = updatedChildren.filter((child): child is Instance => child !== null);
}
