"use client";

import { SupportContactContent } from "@/components/support/support-contact-content";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function PublicSupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">联系客服</h1>
            <p className="mt-2 text-sm text-muted">
              充值、令牌与 API 调用问题，可通过以下方式联系我们
            </p>
          </div>
          <SupportContactContent />
        </div>
      </main>
      <Footer />
    </div>
  );
}
