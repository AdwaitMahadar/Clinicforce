import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import type { AppSession } from "@/lib/auth/session";

/**
 * One parallel prefetch slice: optional session gate + thunk that calls a
 * `React.cache`-wrapped tab fetcher from `lib/detail-tab-fetch-cache.ts`.
 */
export type ParallelTabPrefetchSlice = {
  /** Stable key for each inner `Suspense` boundary. */
  key: string;
  /** If omitted, the slice always runs. If provided, must return true to run. */
  when?: (session: AppSession) => boolean;
  prefetch: () => Promise<unknown>;
};

async function PrefetchRun({ prefetch }: { prefetch: () => Promise<unknown> }) {
  await prefetch();
  return null;
}

/**
 * Invisible parallel warm-up for detail tab `React.cache` slices.
 * Render as a sibling of the detail shell (modal or page). Pass an empty
 * `slices` array for single-tab surfaces (no-op).
 */
export async function ParallelTabDataPrefetch({
  slices,
}: {
  slices: ParallelTabPrefetchSlice[];
}) {
  if (slices.length === 0) return null;

  const session = await getSession();

  const activeSlices = slices.filter((slice) =>
    slice.when ? slice.when(session) : true
  );

  return (
    <>
      {activeSlices.map((slice) => (
        <Suspense key={slice.key} fallback={null}>
          <PrefetchRun prefetch={slice.prefetch} />
        </Suspense>
      ))}
    </>
  );
}
