import type { Metadata } from "next";
import ToolsLoginScreen from "@/components/auth/ToolsLoginScreen";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "FinCognis Giriş | Araçlar",
  description:
    "FinCognis araçlarına erişmek için giriş yapın. Komisyon, korelasyon ve stres modülünü güvenli şekilde kullanın.",
  path: "/tools/login",
});

export default function ToolsLoginPage() {
  // 1) Render static login screen.
  return <ToolsLoginScreen defaultNextPath="/tools" />;
}

