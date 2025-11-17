import { context } from "./context";
import { VNode } from "./types";
import { removeInstance } from "./dom";
// import { cleanupUnusedHooks } from "./hooks";
import { render } from "./render";
import { isEmptyValue } from "../utils";

/**
 * Mini-React 애플리케이션의 루트를 설정하고 첫 렌더링을 시작합니다.
 *
 * @param rootNode - 렌더링할 최상위 VNode
 * @param container - VNode가 렌더링될 DOM 컨테이너
 */
export const setup = (rootNode: VNode | null, container: HTMLElement): void => {
  // 1. 컨테이너 유효성을 검사합니다.
  if (isEmptyValue(container)) {
    throw new Error("컨테이너가 없습니다.");
  }

  // 2. 이전 렌더링 내용을 정리하고 컨테이너를 비웁니다.
  if (context.root.instance && context.root.container) {
    removeInstance(context.root.container, context.root.instance);
  }
  container.innerHTML = "";

  // 3. 루트 컨텍스트와 훅 컨텍스트를 리셋합니다.
  if (isEmptyValue(rootNode)) {
    throw new Error("루트 노드가 없습니다.");
  }
  context.root.reset({ container, node: rootNode! });
  context.hooks.state.clear(); // 새로운 앱 시작 시에는 state도 초기화
  context.hooks.clear();

  // 4. 첫 렌더링을 실행합니다.
  render();
};
