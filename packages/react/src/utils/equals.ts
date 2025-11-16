/**
 * 두 값의 얕은 동등성을 비교합니다.
 * 객체와 배열은 1단계 깊이까지만 비교합니다.
 */
export const shallowEquals = (a: unknown, b: unknown): boolean => {
  // Object.is(), Array.isArray(), Object.keys() 등을 활용하여 1단계 깊이의 비교를 구현합니다.

  // 1. 동일성 검사 (NaN, -0/+0까지 정확한 판별)
  if (Object.is(a, b)) return true;
  /**
   * 숫자/문자/불리언 같은 단일 값이 같지 않다
   * null / undefined 도 같지 않다
   * 두 값의 참조도 동일하지 않다
   */

  // 2. 타입 다르면 무조건 false
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  // ===== 배열 비교 =====
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  // 배열/객체 mismatch 면 false
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // ===== 객체 비교 =====
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  for (const key of aKeys) {
    if (!Object.is(objA[key], objB[key])) return false;
  }

  return true;
};

/**
 * 두 값의 깊은 동등성을 비교합니다.
 * 객체와 배열의 모든 중첩된 속성을 재귀적으로 비교합니다.
 */
export const deepEquals = (a: unknown, b: unknown): boolean => {
  // 1. NaN, -0 등까지 정확히 비교
  if (Object.is(a, b)) return true;

  // 2. 원시 타입, null, 타입 불일치 처리
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  // 3. 배열 비교
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) return false; // 재귀
    }
    return true;
  }

  // 4. 객체 비교
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  const aKeys = Object.keys(objA);
  const bKeys = Object.keys(objB);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!deepEquals(objA[key], objB[key])) return false; // 재귀
  }

  return true;
};
