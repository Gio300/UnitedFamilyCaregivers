"use client";

import { useApp } from "@/context/AppContext";
import { SettingsPIP } from "./SettingsPIP";
import { EligibilityPIP } from "./EligibilityPIP";
import { DocumentsPIP } from "./DocumentsPIP";
import { ExpandPIP } from "./ExpandPIP";
import { SupervisorApprovalPIP } from "./SupervisorApprovalPIP";
import { MessageCenterPIP } from "./MessageCenterPIP";
import { UnifiedNotificationsPIP } from "./UnifiedNotificationsPIP";

interface PIPContainerProps {
  settingsOpen: boolean;
  onCloseSettings: () => void;
  settingsPriority?: boolean;
}

export function PIPContainer({ settingsOpen, onCloseSettings, settingsPriority }: PIPContainerProps) {
  const { pipType, closePIP, expandContent } = useApp();

  return (
    <>
      {settingsOpen && (
        settingsPriority
          ? (
            <div className="fixed inset-0 z-[1000000001] pointer-events-none [&>*]:pointer-events-auto">
              <SettingsPIP onClose={onCloseSettings} />
            </div>
          )
          : <SettingsPIP onClose={onCloseSettings} />
      )}
      {pipType === "eligibility" && <EligibilityPIP onClose={closePIP} />}
      {pipType === "document" && <DocumentsPIP onClose={closePIP} />}
      {pipType === "expand" && expandContent && <ExpandPIP onClose={closePIP} title={expandContent.title} content={expandContent.content} />}
      {pipType === "activity" && expandContent && <ExpandPIP onClose={closePIP} title={expandContent.title} content={expandContent.content} />}
      {pipType === "supervisor_approval" && <SupervisorApprovalPIP onClose={closePIP} />}
      {pipType === "message_center" && <UnifiedNotificationsPIP onClose={closePIP} />}
    </>
  );
}
