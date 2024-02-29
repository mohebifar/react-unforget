export type LogoProps = {
  className?: string;
};
export const Logo = ({ className = "text-xl" }: LogoProps) => (
  <span className={className}>
    <span className="text-indigo-400 font-bold">React</span>{" "}
    <span className="font-extrabold leading-normal text-transparent bg-clip-text bg-gradient bg-animate pb-2">
      Unforget
    </span>
  </span>
);
