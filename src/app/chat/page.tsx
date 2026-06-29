import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export default function ChatPage() {
  return (
    <DashboardShell
      title="AI 对话"
      description="登录后选择 API Key，即可使用对话、图像与视频模型（按平台价目扣费）"
    >
      <ChatWorkspace />
    </DashboardShell>
  );
}
