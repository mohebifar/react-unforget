import dynamic from "next/dynamic";
import { BeforeAfterCodeLayout } from "./BeforeAfterCodeLayout";

const DynamicLiveCodeSandpack = dynamic(() => import("./LiveCodeSandpack"), {
  loading: () => {
    return (
      <BeforeAfterCodeLayout
        before={
          <div className="flex h-96 items-center justify-center">
            <span className="loading loading-spinner loading-md" />
          </div>
        }
        after={
          <div className="flex h-96 items-center justify-center">
            <span className="loading loading-spinner loading-md" />
          </div>
        }
      />
    );
  },
});

export { DynamicLiveCodeSandpack };
