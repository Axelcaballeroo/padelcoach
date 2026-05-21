import Link from "next/link";

type LogoProps = {
  href?: string;
  compact?: boolean;
};

export function Logo({ href = "/", compact = false }: LogoProps) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="PadelCoach">
      <span className="grid size-9 place-items-center rounded-xl bg-foreground text-sm font-black text-background">
        PC
      </span>
      {!compact ? (
        <span className="text-base font-semibold tracking-tight">PadelCoach</span>
      ) : null}
    </Link>
  );
}
