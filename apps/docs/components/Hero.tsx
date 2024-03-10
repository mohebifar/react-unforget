import { OldAndNewCodeReveal } from "./OldAndNewCodeReveal";

export const Hero = () => (
  <div className="py-10 w-full bg-[rgba(17,17,17,var(--tw-bg-opacity))]  dark:bg-dot-white/[0.2] bg-dot-black/[0.2] relative flex items-center justify-center">
    <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-[rgba(17,17,17,var(--tw-bg-opacity))] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
    <div>
      <h1 className="text-4xl sm:text-7xl font-bold relative z-10 bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-500 py-8">
        React Unforget
      </h1>
      <p>
        A compiler for React that optimizes components and hooks for performance
        and readability.
      </p>
      <OldAndNewCodeReveal />
    </div>
  </div>
);
