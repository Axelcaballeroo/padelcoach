import type { LucideIcon } from "lucide-react";

type SectionPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: Array<{
    title: string;
    meta: string;
    status: string;
  }>;
};

export function SectionPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  items,
}: SectionPageProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 lg:py-10">
      <div className="flex items-start gap-4">
        <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
          <Icon size={22} />
        </span>
        <div>
          <p className="text-sm font-semibold text-accent-dark">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        {items.map((item, index) => (
          <div
            key={item.title}
            className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${
              index > 0 ? "border-t border-line" : ""
            }`}
          >
            <div>
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{item.meta}</p>
            </div>
            <span className="w-fit rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
