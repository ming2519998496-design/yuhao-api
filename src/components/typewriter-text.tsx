"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  /** 每个字符间隔（毫秒） */
  speed?: number;
  /** 首次开始打字前的延迟（毫秒） */
  startDelay?: number;
  /** 打完全部文字后停留多久再循环（毫秒） */
  pauseMs?: number;
  /** 是否循环播放 */
  loop?: boolean;
  className?: string;
};

export function TypewriterText({
  text,
  speed = 50,
  startDelay = 600,
  pauseMs = 5000,
  loop = true,
  className,
}: Props) {
  const [length, setLength] = useState(0);
  const [done, setDone] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setLength(0);
    setDone(false);

    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    let pauseTimer: ReturnType<typeof setTimeout> | undefined;
    const delay = cycle === 0 ? startDelay : 0;

    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        index += 1;
        if (index >= text.length) {
          setLength(text.length);
          setDone(true);
          if (interval) clearInterval(interval);

          if (loop) {
            pauseTimer = setTimeout(() => {
              setCycle((c) => c + 1);
            }, pauseMs);
          }
          return;
        }
        setLength(index);
      }, speed);
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
      if (pauseTimer) clearTimeout(pauseTimer);
    };
  }, [text, speed, startDelay, pauseMs, loop, cycle]);

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
