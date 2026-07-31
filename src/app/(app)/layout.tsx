import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";

export default function AppGroup({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
