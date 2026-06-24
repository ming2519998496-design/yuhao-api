"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  /** 每个字符间隔（毫秒） */
  speed?: number;
  /** 开始打字前的延迟（毫秒） */
  startDelay?: number;
  className?: string;
};

export function TypewriterText({
  text,
  speed = 36,
  startDelay = 600,
  className,
}: Props) {
  const [length, setLength] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setLength(0);
    setDone(false);

    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        index += 1;
        if (index >= text.length) {
          setLength(text.length);
          setDone(true);
          if (interval) clearInterval(interval);
          return;
        }
        setLength(index);
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return (
    <span className={className}>
      {text.slice(0, length)}
      <span
        aria-hidden
        className={cn(
          "ml-0.5 inline-block w-[2px] translate-y-px bg-accent align-middle",
          done ? "h-3.5 animate-pulse" : "h-4"
        )}
      />
    </span>
  );
}
