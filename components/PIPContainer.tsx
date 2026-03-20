"use client";

import { useApp } from "@/context/AppContext";
import { SettingsPIP } from "./SettingsPIP";
import { EligibilityPIP } from "./EligibilityPIP";
import { DocumentPIP } from "./DocumentPIP";
import { ExpandPIP } from "./ExpandPIP";

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
      {pipType === "document" && <DocumentPIP onClose={closePIP} />}
      {pipType === "expand" && expandContent && <ExpandPIP onClose={closePIP} title={expandContent.title} content={expandContent.content} />}
    </>
  );
}
