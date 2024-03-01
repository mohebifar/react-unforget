import dynamic from "next/dynamic";
import { MoveRight } from "lucide-react";

const DynamicLiveCodeSandpack = dynamic(() => import("./LiveCodeSandpack"), {
  loading: () => {
    const loadingWindow = (
      <div className="mockup-window bg-gray-200 border dark:bg-gray-800 dark:border-gray-700">
        <div className="w-full bg-gray-100 border dark:bg-gray-900">
          <div className="h-96 flex items-center justify-center">
            <span className="loading loading-spinner loading-md"></span>{" "}
          </div>
          <div className="h-3 bg-gray-100" />
          <div className="h-96 flex items-center justify-center">
            <span className="loading loading-spinner loading-md"></span>{" "}
          </div>
        </div>
      </div>
    );

    return (
      <div className="grid xl:grid-rows-1 xl:grid-cols-beforeAfterCodingBlocks grid-cols-1 grid-row-2 gap-4 w-full mt-6">
        {loadingWindow}

        <div className="items-center hidden xl:flex">
          <MoveRight className="dark:text-gray-100 text-gray-500" size={30} />
        </div>

        {loadingWindow}
      </div>
    );
  },
});

export { DynamicLiveCodeSandpack };
