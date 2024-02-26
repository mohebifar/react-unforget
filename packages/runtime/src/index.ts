import { useRef, type MutableRefObject } from "react";

const UNASSIGNED = Symbol("unassigned");

type UnassignedType = typeof UNASSIGNED;

type FixedArray<T, N extends number, R extends T[] = []> = number extends N
  ? T[]
  : R["length"] extends N
    ? R
    : FixedArray<T, N, [T, ...R]>;

interface CacheEntry<T = any> {
  v: T | UnassignedType;
  get n(): this["v"] extends UnassignedType ? true : false;
  e(newValue: T): void;
}

interface Commit {
  (): void;
}

export const useCreateCache$unforget = <S extends number>(
  size: S
): [FixedArray<CacheEntry, S>, Commit] => {
  const valuesRef: MutableRefObject<FixedArray<CacheEntry, S> | null> =
    useRef(null);

  const commitRef: MutableRefObject<Commit | null> = useRef(null);

  const valuesToCommit: MutableRefObject<Map<number, any> | null> =
    useRef(null);

  // This is needed for hot reloading to work
  const previousSize = useRef(size);

  if (!valuesToCommit.current) {
    valuesToCommit.current = new Map();
  }

  if (!commitRef.current) {
    commitRef.current = () => {
      valuesToCommit.current!.forEach((value, index) => {
        const valuesRefEntry = valuesRef.current![index as never] as CacheEntry;
        return (valuesRefEntry.v = value);
      });

      valuesToCommit.current!.clear();
    };
  }

  if (!valuesRef.current || previousSize.current !== size) {
    previousSize.current = size;
    valuesRef.current = Array.from({ length: size }, (_, i) => {
      return {
        v: UNASSIGNED,
        get n() {
          return this.v === UNASSIGNED;
        },
        e(newValue: any) {
          valuesToCommit.current!.set(i, newValue);
        },
      };
    }) as FixedArray<CacheEntry, S>;
  }

  if (!valuesRef.current || !commitRef.current) {
    throw new Error("Unreachable");
  }

  return [valuesRef.current, commitRef.current];
};
