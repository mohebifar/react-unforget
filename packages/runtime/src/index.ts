import { useRef, type MutableRefObject } from "react";

const UNASSIGNED = Symbol("unassigned");

type CacheEntry<T = any> = {
  v: T;
  get n(): boolean;
  e(newValue: T): void;
};

interface Commit {
  (): void;
}

export const useCreateCache$unforget = (size: number) => {
  const valuesRef: MutableRefObject<CacheEntry[] | null> = useRef(null);

  const commitRef: MutableRefObject<Commit | null> = useRef(null);

  const valuesToCommit: MutableRefObject<Map<number, any> | null> =
    useRef(null);

  if (!valuesToCommit.current) {
    valuesToCommit.current = new Map();
  }

  if (!commitRef.current) {
    commitRef.current = () => {
      valuesToCommit.current!.forEach((value, index) => {
        valuesRef.current![index]!.v = value;
      });
    };
  }

  if (!valuesRef.current) {
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
    });
  }

  if (!valuesRef.current || !commitRef.current) {
    throw new Error("Unreachable");
  }

  return [valuesRef.current, commitRef.current];
};
