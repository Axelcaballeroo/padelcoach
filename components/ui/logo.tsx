import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
  compact?: boolean;
};

export function Logo({ href = "/", compact = false }: LogoProps) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="PadelCoach">
      <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-foreground shadow-sm">
        <Image
          src="/icons/padelcoach-icon-192.png"
          alt=""
          width={36}
          height={36}
          className="size-full object-cover"
        />
      </span>
      {!compact ? (
        <span className="text-base font-semibold tracking-tight">PadelCoach</span>
      ) : null}
    </Link>
  );
}
