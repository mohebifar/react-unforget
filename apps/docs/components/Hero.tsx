import { OldAndNewCodeReveal } from "./OldAndNewCodeReveal";

export const Hero = () => (
  <div className="dark:bg-dot-white/[0.2] bg-dot-black/[0.2] relative flex w-full items-center justify-center bg-[rgba(17,17,17,var(--tw-bg-opacity))] py-10">
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[rgba(17,17,17,var(--tw-bg-opacity))] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
    <div>
      <h1 className="relative z-10 bg-gradient-to-b from-neutral-200 to-neutral-500 bg-clip-text py-8 text-4xl font-bold text-transparent sm:text-7xl">
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
