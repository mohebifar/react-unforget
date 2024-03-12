import { GoArrowRight } from "react-icons/go";
import { PiNumberCircleOneFill, PiNumberCircleTwoFill } from "react-icons/pi";

export interface BeforeAfterCodeLayoutProps {
  before: React.ReactNode;
  after: React.ReactNode;
  afterTitle?: React.ReactNode;
}

export function BeforeAfterCodeLayout({
  before,
  after,
  afterTitle = "React Unforget Result",
}: BeforeAfterCodeLayoutProps) {
  return (
    <div className="xl:grid-cols-beforeAfterCodingBlocks grid-row-2 mt-6 grid w-full grid-cols-1 gap-4 xl:grid-rows-1">
      <div>
        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#1d1c20]">
          <div className="flex-1 py-4 pr-4 text-center font-bold">
            <div className="flex items-center justify-center gap-2">
              <PiNumberCircleOneFill size={18} /> Input Code
            </div>
          </div>

          {before}
        </div>
      </div>

      <div className="hidden items-center xl:flex">
        <div className="relative">
          <GoArrowRight
            className="absolute left-1/2 -translate-x-1/3 text-gray-500 dark:text-gray-100"
            size={34}
          />
        </div>
      </div>

      <div>
        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#1d1c20]">
          <div className="flex-1 py-4 pr-4 text-center font-bold">
            <div className="flex items-center justify-center gap-2">
              <PiNumberCircleTwoFill size={18} /> {afterTitle}
            </div>
          </div>

          {after}
        </div>
      </div>
    </div>
  );
}
