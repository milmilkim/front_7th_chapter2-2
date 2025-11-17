import { useRef } from "../hooks";
import { type FunctionComponent, type VNode } from "../core";
import { shallowEquals } from "../utils";

/**
 * 컴포넌트의 props가 변경되지 않았을 경우, 마지막 렌더링 결과를 재사용하여
 * 리렌더링을 방지하는 고차 컴포넌트(HOC)입니다.
 *
 * @param Component - 메모이제이션할 컴포넌트
 * @param equals - props를 비교할 함수 (기본값: shallowEquals)
 * @returns 메모이제이션이 적용된 새로운 컴포넌트
 */
export function memo<P extends object>(Component: FunctionComponent<P>, equals = shallowEquals) {
  // useRef를 사용하여 이전 props와 렌더링 결과를 저장해야 합니다.
  // equals 함수로 이전 props와 현재 props를 비교하여 렌더링 여부를 결정합니다.

  const MemoizedComponent: FunctionComponent<P> = (props: P) => {
    const ref = useRef<{
      prevProps: P | null;
      prevVNode: VNode | null;
    }>({
      prevProps: null,
      prevVNode: null,
    });

    // 첫 렌더 → 무조건 렌더
    if (ref.current.prevProps === null) {
      const vNode = Component(props);
      ref.current.prevProps = props;
      ref.current.prevVNode = vNode;
      return vNode;
    }

    // props 같으면 → 이전 결과 그대로 반환 (렌더 스킵)
    if (equals(ref.current.prevProps, props)) {
      return ref.current.prevVNode!;
    }

    // props 다르면 → 다시 렌더 후 저장
    const nextVNode = Component(props);
    ref.current.prevProps = props;
    ref.current.prevVNode = nextVNode;
    return nextVNode;
  };

  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name})`;

  return MemoizedComponent;
}
