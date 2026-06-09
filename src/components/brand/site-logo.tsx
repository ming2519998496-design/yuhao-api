import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/site-logo.png";

const sizeMap = {
  sm: {
    box: "h-9 w-9 rounded-xl",
    text: "text-lg font-semibold",
    accent: "text-accent-light",
  },
  md: {
    box: "h-11 w-11 rounded-xl sm:h-12 sm:w-12",
    text: "text-xl font-semibold tracking-tight sm:text-2xl",
    accent: "text-accent",
  },
  auth: {
    box: "h-11 w-11 rounded-xl",
    text: "text-xl font-semibold",
    accent: "text-accent",
  },
} as const;

type SiteLogoProps = {
  size?: keyof typeof sizeMap;
  showText?: boolean;
  href?: string | null;
  className?: string;
  textClassName?: string;
};

export function SiteLogo({
  size = "md",
  showText = true,
  href = "/",
  className,
  textClassName,
}: SiteLogoProps) {
  const s = sizeMap[size];

  const inner = (
    <>
      <span
        className={cn(
          "relative shrink-0 overflow-hidden shadow-md shadow-accent/20",
          s.box
        )}
      >
        <Image
          src={LOGO_SRC}
          alt="遇好API"
          width={142}
          height={142}
          className="h-full w-full object-cover"
          priority={size === "md" || size === "auth"}
        />
      </span>
      {showText && (
        <span className={cn(s.text, textClassName)}>
          遇好<span className={s.accent}>API</span>
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("flex items-center gap-2.5 sm:gap-3", className)}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 sm:gap-3", className)}>
      {inner}
    </div>
  );
}
