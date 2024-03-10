import dynamic from "next/dynamic";

const DynamicDependencyGraphViewer = dynamic(
  () => import("./DependencyGraphViewer"),
  {
    loading: () => (
      <div className="flex h-[300px] items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    ),
  },
);

export { DynamicDependencyGraphViewer };
