"use client";

import { useApp } from "@/context/AppContext";
import { SettingsPIP } from "./SettingsPIP";
import { EligibilityPIP } from "./EligibilityPIP";
import { DocumentsPIP } from "./DocumentsPIP";
import { ExpandPIP } from "./ExpandPIP";
import { SupervisorApprovalPIP } from "./SupervisorApprovalPIP";

interface PIPContainerProps {
  settingsOpen: boolean;
  onCloseSettings: () => void;
}

export function PIPContainer({ settingsOpen, onCloseSettings }: PIPContainerProps) {
  const { pipType, closePIP, expandContent } = useApp();

  return (
    <>
      {settingsOpen && <SettingsPIP onClose={onCloseSettings} />}
      {pipType === "eligibility" && <EligibilityPIP onClose={closePIP} />}
      {pipType === "document" && <DocumentsPIP onClose={closePIP} />}
      {pipType === "expand" && expandContent && <ExpandPIP onClose={closePIP} title={expandContent.title} content={expandContent.content} />}
      {pipType === "activity" && expandContent && <ExpandPIP onClose={closePIP} title={expandContent.title} content={expandContent.content} />}
      {pipType === "supervisor_approval" && <SupervisorApprovalPIP onClose={closePIP} />}
    </>
  );
}
