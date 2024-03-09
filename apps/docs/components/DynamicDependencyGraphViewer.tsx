import dynamic from "next/dynamic";

const DynamicDependencyGraphViewer = dynamic(
  () => import("./DependencyGraphViewer"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[300px]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    ),
  },
);

export { DynamicDependencyGraphViewer };
