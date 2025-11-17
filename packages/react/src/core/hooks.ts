import { shallowEquals, withEnqueue } from "../utils";
import { context } from "./context";
import { EffectHook } from "./types";
import { enqueueRender } from "./render";
import { HookTypes } from "./constants";

const isEffectHook = (hook: unknown): hook is EffectHook => {
  return Boolean(hook && typeof hook === "object" && (hook as EffectHook).kind === HookTypes.EFFECT);
};

const flushEffects = () => {
  const queue = context.effects.queue.splice(0);
  queue.forEach(({ path, cursor }) => {
    const hooks = context.hooks.state.get(path);
    if (!hooks) return;
    const hook = hooks[cursor];
    if (!isEffectHook(hook)) return;

    if (typeof hook.cleanup === "function") {
      hook.cleanup();
      hook.cleanup = null;
    }

    const cleanup = hook.effect();
    hook.cleanup = typeof cleanup === "function" ? cleanup : null;
  });
};

const enqueueEffects = withEnqueue(flushEffects);

/**
 * 사용되지 않는 컴포넌트의 훅 상태와 이펙트 클린업 함수를 정리합니다.
 */
export const cleanupUnusedHooks = () => {
  const removedPaths = new Set<string>();

  for (const [path, hooks] of context.hooks.state.entries()) {
    if (context.hooks.visited.has(path)) continue;

    hooks.forEach((hook) => {
      if (isEffectHook(hook) && typeof hook.cleanup === "function") {
        hook.cleanup();
        hook.cleanup = null;
      }
    });

    context.hooks.state.delete(path);
    context.hooks.cursor.delete(path);
    removedPaths.add(path);
  }

  if (removedPaths.size > 0) {
    context.effects.queue = context.effects.queue.filter(({ path }) => !removedPaths.has(path));
  }
};

/**
 * 컴포넌트의 상태를 관리하기 위한 훅입니다.
 * @param initialValue - 초기 상태 값 또는 초기 상태를 반환하는 함수
 * @returns [현재 상태, 상태를 업데이트하는 함수]
 */
export const useState = <T>(initialValue: T | (() => T)): [T, (nextValue: T | ((prev: T) => T)) => void] => {
  // 여기를 구현하세요.
  // 1. 현재 컴포넌트의 훅 커서와 상태 배열을 가져옵니다.
  const path = context.hooks.currentPath;
  const cursor = context.hooks.currentCursor;
  const hooks = context.hooks.currentHooks;
  console.log("useState called", { path, cursor, hooksLength: hooks.length, currentValue: hooks[cursor] });

  // 2. 첫 렌더링이라면 초기값으로 상태를 설정합니다.
  if (hooks[cursor] === undefined) {
    const value = typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
    hooks[cursor] = value;
  }

  const currentValue = hooks[cursor];

  // 3. 상태 변경 함수(setter)를 생성합니다.
  //    - 새 값이 이전 값과 같으면(Object.is) 재렌더링을 건너뜁니다.
  //    - 값이 다르면 상태를 업데이트하고 재렌더링을 예약(enqueueRender)합니다.
  const setState = (nextValue: T | ((prev: T) => T)) => {
    // setState는 컴포넌트 바깥에서도 호출될 수 있으므로, path와 cursor를 클로저로 캡처
    const stateArray = context.hooks.state.get(path);
    console.log("setState called", { path, cursor, stateArray, nextValue });
    if (!stateArray) return;

    const prevValue = stateArray[cursor];
    const newValue = typeof nextValue === "function" ? (nextValue as (prev: T) => T)(prevValue) : nextValue;
    console.log("setState values", { prevValue, newValue });

    if (!Object.is(newValue, prevValue)) {
      stateArray[cursor] = newValue;
      console.log("setState updated", stateArray[cursor]);
      enqueueRender();
    }
  };

  // 4. 훅 커서를 증가시키고 [상태, setter]를 반환합니다.
  context.hooks.cursor.set(path, cursor + 1);
  return [currentValue, setState];
};

/**
 * 컴포넌트의 사이드 이펙트를 처리하기 위한 훅입니다.
 * @param effect - 실행할 이펙트 함수. 클린업 함수를 반환할 수 있습니다.
 * @param deps - 의존성 배열. 이 값들이 변경될 때만 이펙트가 다시 실행됩니다.
 */

export const useEffect = (effect: () => (() => void) | void, deps?: unknown[]): void => {
  const path = context.hooks.currentPath;
  const cursor = context.hooks.currentCursor;
  const hooks = context.hooks.currentHooks;

  const prevHook = hooks[cursor];
  const depsArray = Array.isArray(deps) ? deps : null;

  const shouldRun =
    depsArray === null ||
    !prevHook ||
    !isEffectHook(prevHook) ||
    prevHook.deps === null ||
    !shallowEquals(prevHook.deps, depsArray);

  const hook: EffectHook = {
    kind: HookTypes.EFFECT,
    deps: depsArray,
    cleanup: isEffectHook(prevHook) ? prevHook.cleanup : null,
    effect,
  };

  hooks[cursor] = hook;

  if (shouldRun) {
    context.effects.queue.push({ path, cursor });
    enqueueEffects();
  }

  context.hooks.cursor.set(path, cursor + 1);
};
