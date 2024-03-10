export type LogoProps = {
  className?: string;
};
export const Logo = ({ className = "text-xl" }: LogoProps) => (
  <span className={className}>
    <span className="font-bold text-indigo-400">React</span>{" "}
    <span className="bg-gradient bg-animate bg-clip-text pb-2 font-extrabold leading-normal text-transparent">
      Unforget
    </span>
  </span>
);
