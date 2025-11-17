/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmptyValue } from "../utils";
import { VNode } from "./types";
import { Fragment, TEXT_ELEMENT } from "./constants";

export const isVNode = (value: any): value is VNode =>
  value && typeof value === "object" && "type" in value && "props" in value;

/**
 * 주어진 노드를 VNode 형식으로 정규화합니다.
 * null, undefined, boolean, 배열, 원시 타입 등을 처리하여 일관된 VNode 구조를 보장합니다.
 */
export const normalizeNode = (node: unknown): VNode | VNode[] | null => {
  // 1) null / undefined / boolean → 렌더링 안 함
  if (isEmptyValue(node)) {
    return null;
  }

  // 2) 이미 VNode라면 그대로
  if (isVNode(node)) {
    return node;
  }

  // 3) 문자열/숫자 → TEXT_ELEMENT
  if (typeof node === "string" || typeof node === "number") {
    return createTextElement(node);
  }

  // 4) 배열 (Fragment) → 내부 항목 모두 normalize
  if (Array.isArray(node)) {
    const normalized: VNode[] = node
      .map((child) => normalizeNode(child))
      .flat() // 배열 안의 배열 flatten
      .filter((child): child is VNode => child !== null);

    return normalized;
  }

  // 5) 그 외 타입 (객체/함수 등) → 렌더러에서 처리 불가 → 무시
  return null;
};

/**
 * 텍스트 노드를 위한 VNode를 생성합니다.
 */
const createTextElement = (node: string | number): VNode => {
  return {
    type: TEXT_ELEMENT,
    key: null,
    props: {
      children: [],
      nodeValue: typeof node === "string" ? node : node.toString(),
    },
  } as VNode;
};

/**
 * JSX로부터 전달된 인자를 VNode 객체로 변환합니다.
 * 이 함수는 JSX 변환기에 의해 호출됩니다. (예: Babel, TypeScript)
 */
export const createElement = (
  type: string | symbol | React.ComponentType<any>,
  originProps?: Record<string, any> | null,
  ...rawChildren: any[]
) => {
  // 여기를 구현하세요.
  const { key, ...props } = originProps ?? {};

  const children: VNode[] = rawChildren
    .map((child) => normalizeNode(child))
    .flat()
    .filter((child): child is VNode => child !== null);

  const mergedProps = { ...props, ...(children.length > 0 ? { children } : {}) };

  const vNode: VNode = {
    type,
    key: key ?? null,
    props: mergedProps,
  };
  return vNode;
};

/**
 * 부모 경로와 자식의 key/index를 기반으로 고유한 경로를 생성합니다.
 * 이는 훅의 상태를 유지하고 Reconciliation에서 컴포넌트를 식별하는 데 사용됩니다.
 */
export const createChildPath = (
  parentPath: string,
  key: string | null,
  index: number,
  nodeType?: string | symbol | React.ComponentType,
  siblings?: VNode[],
): string => {
  // 1. prefix 결정 (컴포넌트 타입별로 구분)
  let prefix = "h"; // host (일반 HTML 요소)
  if (typeof nodeType === "function") {
    // 함수형 컴포넌트는 함수 이름을 포함
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    prefix = `c:${(nodeType as Function).name || "anonymous"}`;
  } else if (nodeType === Fragment) {
    prefix = "f"; // fragment
  } else if (nodeType === TEXT_ELEMENT) {
    prefix = "t"; // text
  }

  // 2. key가 있으면 key 기반으로 경로 생성
  if (key != null) {
    const id = `${prefix}:key(${key})`;
    return parentPath ? `${parentPath}/${id}` : id;
  }

  // 3. key가 없으면 같은 타입의 형제들 중 몇 번째인지 계산 (stableIndex)
  const sibs = siblings ?? [];
  const sameTypeSiblings = sibs.filter((s) => s.type === nodeType);
  const vnode = sibs[index] ?? null;
  const stableIndex = vnode !== null ? sameTypeSiblings.indexOf(vnode) : index;

  const id = `${prefix}:${stableIndex}`;
  return parentPath ? `${parentPath}/${id}` : id;
};
