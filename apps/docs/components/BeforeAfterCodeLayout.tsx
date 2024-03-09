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
        <div className="bg-[#1d1c20] border border-white/[0.08] rounded-lg overflow-hidden">
          <div className="text-center font-bold flex-1 py-4 pr-4">
            <div className="flex items-center justify-center gap-2">
              <PiNumberCircleOneFill size={18} /> Input Code
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
        <div className="bg-[#1d1c20] border border-white/[0.08] rounded-lg overflow-hidden">
          <div className="text-center font-bold flex-1 py-4 pr-4">
            <div className="flex items-center justify-center gap-2">
              <PiNumberCircleTwoFill size={18} /> React Unforget Result
            </div>
          </div>

          {after}
        </div>
      </div>
    </div>
  );
}
