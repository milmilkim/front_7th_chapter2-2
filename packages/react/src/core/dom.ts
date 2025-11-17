/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmptyValue } from "../utils/validators";
// import { NodeType, NodeTypes } from "./constants";
import { Instance } from "./types";

type EventMap = Record<string, EventListener>;

const isEventProp = (key: string): boolean => /^on[A-Z]/.test(key);
const toEventName = (key: string): string => key.slice(2).toLowerCase();
const eventStore = new WeakMap<HTMLElement, EventMap>();

const getEventStore = (dom: HTMLElement): EventMap => {
  if (!eventStore.has(dom)) {
    eventStore.set(dom, {});
  }
  return eventStore.get(dom)!;
};

/**
 * DOM 요소에 속성(props)을 설정합니다.
 * 이벤트 핸들러, 스타일, className 등 다양한 속성을 처리해야 합니다.
 */
export const setDomProps = (dom: HTMLElement, props: Record<string, any>) => {
  for (const key in props) {
    if (key === "children" || key === "nodeValue") continue;

    const value = props[key];

    if (isEventProp(key)) {
      const eventName = toEventName(key);
      dom.addEventListener(eventName, value);
      getEventStore(dom)[eventName] = value;
      continue;
    }

    if (key === "style" && typeof value === "object") {
      Object.assign(dom.style, value);
      continue;
    }

    if (key === "className") {
      dom.className = value || "";
      continue;
    }

    if (value === true) dom.setAttribute(key, "");
    else if (value === false || value == null) dom.removeAttribute(key);
    else dom.setAttribute(key, String(value));
  }
};

/**
 * 이전 속성과 새로운 속성을 비교하여 DOM 요소의 속성을 업데이트합니다.
 * 변경된 속성만 효율적으로 DOM에 반영해야 합니다.
 */
export const updateDomProps = (
  dom: HTMLElement,
  prevProps: Record<string, any> = {},
  nextProps: Record<string, any> = {},
) => {
  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);

  keys.forEach((key) => {
    if (key === "children" || key === "nodeValue") return;

    const prevValue = prevProps[key];
    const nextValue = nextProps[key];

    // 동일하면 스킵
    if (prevValue === nextValue) return;

    // ===== 이벤트 =====
    if (isEventProp(key)) {
      const eventName = toEventName(key);
      const store = eventStore.get(dom);
      const prevListener = store?.[eventName];

      if (prevListener) {
        dom.removeEventListener(eventName, prevListener);
        delete store[eventName];
      }

      if (typeof nextValue === "function") {
        dom.addEventListener(eventName, nextValue);
        getEventStore(dom)[eventName] = nextValue;
      }

      return;
    }

    // ===== 스타일 =====
    if (key === "style") {
      const prevStyle = prevValue || {};
      const nextStyle = nextValue || {};

      // 제거할 스타일
      for (const k in prevStyle) {
        if (!(k in nextStyle)) (dom.style as any)[k] = "";
      }

      // 추가/업데이트
      Object.assign(dom.style, nextStyle);

      return;
    }

    // ===== className =====
    if (key === "className") {
      dom.className = nextValue || "";
      return;
    }

    // ===== 일반 attribute =====
    if (nextValue === true) dom.setAttribute(key, "");
    else if (nextValue === false || nextValue == null) dom.removeAttribute(key);
    else dom.setAttribute(key, String(nextValue));
  });
};
/**
 * 주어진 인스턴스에서 실제 DOM 노드(들)를 재귀적으로 찾아 배열로 반환합니다.
 * Fragment나 컴포넌트 인스턴스는 여러 개의 DOM 노드를 가질 수 있습니다.
 */
export const getDomNodes = (instance: Instance | null): (HTMLElement | Text)[] => {
  if (!instance) return [];

  // 1) host/text이면 자기 dom 그대로 반환
  if (instance.dom) {
    return [instance.dom];
  }

  // 2) function component / fragment → children dom 반환
  const nodes: (HTMLElement | Text)[] = [];
  for (const child of instance.children) {
    nodes.push(...getDomNodes(child));
  }
  return nodes;
};

/**
 * 주어진 인스턴스에서 첫 번째 실제 DOM 노드를 찾습니다.
 */
export const getFirstDom = (instance: Instance | null): HTMLElement | Text | null => {
  if (isEmptyValue(instance)) {
    return null;
  }

  // 현재 인스턴스가 실제 DOM을 갖고 있다면 즉시 반환
  if (instance!.dom) {
    return instance!.dom;
  }

  // 함수형 컴포넌트나 Fragment 등 → 자식에서 첫 DOM을 찾기
  for (const child of instance!.children) {
    const dom = getFirstDom(child);
    if (dom) return dom;
  }

  return null;
};

/**
 * 자식 인스턴스들로부터 첫 번째 실제 DOM 노드를 찾습니다.
 */
export const getFirstDomFromChildren = (children: (Instance | null)[]): HTMLElement | Text | null => {
  if (isEmptyValue(children)) {
    return null;
  }
  for (const child of children) {
    const dom = getFirstDom(child);
    if (dom) return dom;
  }
  return null;
};

/**
 * 인스턴스를 부모 DOM에 삽입합니다.
 * anchor 노드가 주어지면 그 앞에 삽입하여 순서를 보장합니다.
 */

export const insertInstance = (
  parentDom: HTMLElement,
  instance: Instance | null,
  anchor: HTMLElement | Text | null = null,
): void => {
  if (!instance) return;

  const nodes = getDomNodes(instance);
  for (const node of nodes) {
    parentDom.insertBefore(node, anchor);
  }
};

/**
 * 부모 DOM에서 인스턴스에 해당하는 모든 DOM 노드를 제거합니다.
 */
export const removeInstance = (parentDom: HTMLElement, instance: Instance | null): void => {
  if (isEmptyValue(instance)) {
    return;
  }
  const nodes = getDomNodes(instance);
  nodes.forEach((node) => {
    parentDom.removeChild(node);
  });
};
