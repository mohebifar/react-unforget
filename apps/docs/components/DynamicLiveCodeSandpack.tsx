import dynamic from "next/dynamic";
import { BeforeAfterCodeLayout } from "./BeforeAfterCodeLayout";

const DynamicLiveCodeSandpack = dynamic(() => import("./LiveCodeSandpack"), {
  loading: () => {
    return (
      <BeforeAfterCodeLayout
        before={
          <div className="h-96 flex items-center justify-center">
            <span className="loading loading-spinner loading-md"></span>{" "}
          </div>
        }
        after={
          <div className="h-96 flex items-center justify-center">
            <span className="loading loading-spinner loading-md"></span>{" "}
          </div>
        }
      />
    );
  },
});

export { DynamicLiveCodeSandpack };
