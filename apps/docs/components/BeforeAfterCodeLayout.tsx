import { GoArrowRight } from "react-icons/go";
import { PiNumberCircleOneFill, PiNumberCircleTwoFill } from "react-icons/pi";

export interface BeforeAfterCodeLayoutProps {
  before: React.ReactNode;
  after: React.ReactNode;
}

export function BeforeAfterCodeLayout({
  before,
  after,
}: BeforeAfterCodeLayoutProps) {
  return (
    <div className="grid xl:grid-rows-1 xl:grid-cols-beforeAfterCodingBlocks grid-cols-1 grid-row-2 gap-4 w-full mt-6">
      <div>
        <div className="mockup-browser bg-gray-200 border dark:bg-gray-800 dark:border-gray-700">
          <div className="mockup-browser-toolbar">
            <div className="text-center font-bold flex-1 pr-20">
              <div className="flex items-center justify-center gap-2">
                <PiNumberCircleOneFill size={18} /> Input Code
              </div>
            </div>
          </div>
          {before}
        </div>
      </div>

      <div className="items-center hidden xl:flex">
        <div className="relative">
          <GoArrowRight
            className="dark:text-gray-100 text-gray-500 absolute left-1/2 -translate-x-1/3"
            size={34}
          />
        </div>
      </div>

      <div>
        <div className="mockup-browser bg-gray-200 border dark:bg-gray-800 dark:border-gray-700">
          <div className="mockup-browser-toolbar">
            <div className="text-center font-bold flex-1 pr-20">
              <div className="flex items-center justify-center gap-2">
                <PiNumberCircleTwoFill size={18} /> React Unforget Result
              </div>
            </div>
          </div>
          {after}
        </div>
      </div>
    </div>
  );
}
