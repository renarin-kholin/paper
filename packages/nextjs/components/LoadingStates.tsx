import { Loader2 } from "lucide-react";

type FeedSkeletonProps = {
  count?: number;
};

const BASE_SKELETON = "rounded bg-stone-100 motion-safe:animate-pulse";

export function FeedCardSkeleton({ count = 3 }: FeedSkeletonProps) {
  return (
    <div className="space-y-10" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="flex gap-4 sm:gap-6 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-6 w-6 rounded-full ${BASE_SKELETON}`} />
              <div className={`h-4 w-32 ${BASE_SKELETON}`} />
            </div>

            <div className="mb-2 space-y-2">
              <div className={`h-7 md:h-8 w-11/12 ${BASE_SKELETON}`} />
              <div className={`h-7 md:h-8 w-3/5 ${BASE_SKELETON}`} />
            </div>

            <div className="hidden sm:block space-y-2">
              <div className={`h-4 w-full ${BASE_SKELETON}`} />
              <div className={`h-4 w-5/6 ${BASE_SKELETON}`} />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-16 ${BASE_SKELETON}`} />
                <div className={`h-3 w-14 ${BASE_SKELETON}`} />
                <div className={`h-3 w-20 ${BASE_SKELETON}`} />
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full ${BASE_SKELETON}`} />
                <div className={`h-6 w-6 rounded-full ${BASE_SKELETON}`} />
              </div>
            </div>
          </div>
          <div className={`w-[100px] h-[96px] sm:w-[152px] sm:h-[112px] shrink-0 rounded-sm ${BASE_SKELETON}`} />
        </article>
      ))}
    </div>
  );
}

export function BookmarksPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading bookmarks</span>
      <div className="mb-8" aria-hidden>
        <div className={`h-10 w-44 mb-2 ${BASE_SKELETON}`} />
        <div className={`h-4 w-32 ${BASE_SKELETON}`} />
      </div>
      <FeedCardSkeleton count={3} />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row w-full" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading page content</span>
      <div className="flex-1 max-w-[680px] px-8 lg:pr-12 py-6 sm:py-8">
        <div className="border-b border-stone-200 mb-8 flex gap-8" aria-hidden>
          <div className="pb-4">
            <div className={`h-5 w-16 ${BASE_SKELETON}`} />
            <div className="mt-3 h-[1px] w-full bg-stone-900" />
          </div>
          <div className="pb-4">
            <div className={`h-5 w-20 ${BASE_SKELETON}`} />
          </div>
        </div>
        <FeedCardSkeleton count={4} />
      </div>

      <aside className="hidden lg:block w-[320px] py-8 border-l border-stone-100 pl-8">
        <div className="sticky top-24 space-y-10" aria-hidden>
          <div className="space-y-4">
            <div className={`h-5 w-40 ${BASE_SKELETON}`} />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className={`h-9 ${index % 2 === 0 ? "w-24" : "w-20"} rounded-full ${BASE_SKELETON}`} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`h-5 w-32 ${BASE_SKELETON}`} />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full ${BASE_SKELETON}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-3 w-24 ${BASE_SKELETON}`} />
                  <div className={`h-3 w-16 ${BASE_SKELETON}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading search results</span>
      <div className="mb-8" aria-hidden>
        <div className={`h-5 w-44 mb-3 ${BASE_SKELETON}`} />
        <div className={`h-10 w-64 mb-2 ${BASE_SKELETON}`} />
        <div className={`h-4 w-28 ${BASE_SKELETON}`} />
      </div>

      <div className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-5" aria-hidden>
        <div className={`h-3 w-20 mb-3 ${BASE_SKELETON}`} />
        <div className={`h-5 w-40 mb-2 ${BASE_SKELETON}`} />
        <div className={`h-4 w-56 ${BASE_SKELETON}`} />
      </div>

      <FeedCardSkeleton count={3} />
    </div>
  );
}

export function PostPageSkeleton() {
  return (
    <article className="max-w-3xl mx-auto py-8 sm:py-12" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading story</span>
      <div className={`mb-8 h-72 rounded-2xl border border-stone-200 ${BASE_SKELETON}`} />

      <div className="mb-8 space-y-3" aria-hidden>
        <div className={`h-12 w-11/12 ${BASE_SKELETON}`} />
        <div className={`h-12 w-3/4 ${BASE_SKELETON}`} />
      </div>

      <div className="pb-8 border-b border-stone-100 mb-10 flex items-center justify-between" aria-hidden>
        <div className="space-y-2">
          <div className={`h-5 w-48 ${BASE_SKELETON}`} />
          <div className="flex items-center gap-2">
            <div className={`h-4 w-24 ${BASE_SKELETON}`} />
            <div className={`h-4 w-2 ${BASE_SKELETON}`} />
            <div className={`h-4 w-20 ${BASE_SKELETON}`} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-9 w-20 rounded-full ${BASE_SKELETON}`} />
          <div className={`h-9 w-9 rounded-full ${BASE_SKELETON}`} />
          <div className={`h-9 w-9 rounded-full ${BASE_SKELETON}`} />
        </div>
      </div>

      <div className="space-y-4 mb-16" aria-hidden>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className={`h-5 ${index % 3 === 0 ? "w-[96%]" : index % 3 === 1 ? "w-full" : "w-[88%]"} ${BASE_SKELETON}`}
          />
        ))}
      </div>

      <div className="border-t border-stone-200 pt-8" aria-hidden>
        <div className="mb-6 flex items-center gap-2">
          <div className={`h-5 w-5 ${BASE_SKELETON}`} />
          <div className={`h-6 w-36 ${BASE_SKELETON}`} />
        </div>
        <CommentSkeleton count={2} />
      </div>
    </article>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading profile</span>
      <div className={`h-48 md:h-64 rounded-2xl mb-16 ${BASE_SKELETON}`} />
      <div className="-mt-20 mb-6 pl-4 md:pl-8">
        <div className={`w-28 h-28 rounded-full border-4 border-white shadow-xl ${BASE_SKELETON}`} />
      </div>

      <div className="px-4 md:px-8 pb-8">
        <div className="flex items-start justify-between mb-5 gap-4" aria-hidden>
          <div className="flex-1 min-w-0">
            <div className={`h-9 w-56 mb-2 ${BASE_SKELETON}`} />
            <div className={`h-4 w-48 mb-2 ${BASE_SKELETON}`} />
            <div className="space-y-2 mb-4">
              <div className={`h-5 w-5/6 ${BASE_SKELETON}`} />
              <div className={`h-5 w-2/3 ${BASE_SKELETON}`} />
            </div>
            <div className="flex items-center gap-3">
              <div className={`h-4 w-20 ${BASE_SKELETON}`} />
              <div className={`h-4 w-2 ${BASE_SKELETON}`} />
              <div className={`h-4 w-20 ${BASE_SKELETON}`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-9 w-24 rounded-full ${BASE_SKELETON}`} />
            <div className={`h-9 w-28 rounded-full ${BASE_SKELETON}`} />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8" aria-hidden>
          <div className={`h-5 w-28 ${BASE_SKELETON}`} />
          <div className={`h-5 w-36 ${BASE_SKELETON}`} />
        </div>

        <div className="border-t border-stone-100 mt-8 pt-6">
          <div className={`h-7 w-40 mb-6 ${BASE_SKELETON}`} />
          <FeedCardSkeleton count={2} />
        </div>
      </div>
    </div>
  );
}

export function ProfileEditorSkeleton() {
  return (
    <div className="max-w-3xl mx-auto" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading profile editor</span>
      <div className={`h-48 md:h-64 rounded-2xl mb-16 ${BASE_SKELETON}`} />
      <div className="-mt-20 mb-6 pl-4 md:pl-8">
        <div className={`w-28 h-28 rounded-full border-4 border-white shadow-xl ${BASE_SKELETON}`} />
      </div>

      <div className="px-4 md:px-8 pb-12 space-y-6" aria-hidden>
        <div className="space-y-2">
          <div className={`h-4 w-24 ${BASE_SKELETON}`} />
          <div className={`h-12 w-full ${BASE_SKELETON}`} />
          <div className={`h-3 w-56 ${BASE_SKELETON}`} />
        </div>

        <div className="space-y-2">
          <div className={`h-4 w-28 ${BASE_SKELETON}`} />
          <div className={`h-12 w-full ${BASE_SKELETON}`} />
        </div>

        <div className="space-y-2">
          <div className={`h-4 w-14 ${BASE_SKELETON}`} />
          <div className={`h-32 w-full ${BASE_SKELETON}`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`h-12 w-full ${BASE_SKELETON}`} />
          <div className={`h-12 w-full ${BASE_SKELETON}`} />
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-stone-100">
          <div className={`h-4 w-40 ${BASE_SKELETON}`} />
          <div className={`h-11 w-32 rounded-xl ${BASE_SKELETON}`} />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard</span>
      <div className="mb-10 rounded-3xl border border-stone-200 p-7 sm:p-10">
        <div className="flex items-start justify-between gap-6" aria-hidden>
          <div>
            <div className={`h-10 w-72 mb-3 ${BASE_SKELETON}`} />
            <div className={`h-5 w-[28rem] max-w-full ${BASE_SKELETON}`} />
          </div>
          <div className={`hidden sm:block h-9 w-44 rounded-full ${BASE_SKELETON}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10 sm:mb-12" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-full ${BASE_SKELETON}`} />
              <div className={`h-4 w-28 ${BASE_SKELETON}`} />
            </div>
            <div className={`h-10 w-28 mb-3 ${BASE_SKELETON}`} />
            <div className={`h-4 w-24 ${BASE_SKELETON}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 sm:mb-12" aria-hidden>
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className={`h-6 w-28 mb-4 ${BASE_SKELETON}`} />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className={`h-4 w-28 ${BASE_SKELETON}`} />
                <div className={`h-4 w-14 ${BASE_SKELETON}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className={`h-6 w-32 mb-4 ${BASE_SKELETON}`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`h-11 rounded-xl ${BASE_SKELETON}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden" aria-hidden>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <div className={`h-6 w-24 ${BASE_SKELETON}`} />
          <div className={`h-4 w-20 ${BASE_SKELETON}`} />
        </div>
        <div className="divide-y divide-stone-100">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 sm:p-6 flex items-center justify-between">
              <div className="space-y-2">
                <div className={`h-6 w-64 max-w-[70vw] ${BASE_SKELETON}`} />
                <div className={`h-4 w-32 ${BASE_SKELETON}`} />
              </div>
              <div className="space-y-2 text-right">
                <div className={`h-4 w-16 ${BASE_SKELETON}`} />
                <div className={`h-3 w-12 ${BASE_SKELETON}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CenteredSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        <Loader2 className="w-7 h-7 motion-safe:animate-spin text-stone-400 mx-auto mb-3" />
        <p className="text-stone-500 text-sm">{label}</p>
      </div>
    </div>
  );
}

export function CommentSkeleton({ count = 3 }: FeedSkeletonProps) {
  return (
    <div className="space-y-6" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border-b border-stone-100 pb-6 last:border-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-full ${BASE_SKELETON}`} />
            <div className={`h-4 w-24 ${BASE_SKELETON}`} />
            <div className={`h-4 w-16 ${BASE_SKELETON}`} />
          </div>
          <div className="space-y-2">
            <div className={`h-4 w-full ${BASE_SKELETON}`} />
            <div className={`h-4 w-5/6 ${BASE_SKELETON}`} />
            <div className={`h-4 w-2/3 ${BASE_SKELETON}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
