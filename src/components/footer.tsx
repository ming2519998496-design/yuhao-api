"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface/50">
      <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <motion.div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center"
        >
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="text-lg font-semibold">
              遇好<span className="text-accent-light">API</span>
            </span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            AI，像呼吸一样自然，像电力一样普惠
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 flex flex-col items-center gap-2 border-t border-border pt-6"
        >
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} 遇好API. All rights reserved.
          </p>
          <p className="text-xs text-muted/80">
            本站为演示项目，非真实商业服务
          </p>
        </motion.div>
      </motion.div>
    </footer>
  );
}
