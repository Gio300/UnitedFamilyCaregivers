"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  useEffect(() => {
    const driverObj = driver({
      showProgress: true,
      steps: [
        { element: "body", popover: { title: "Welcome", description: "Let's take a quick tour.", side: "bottom", align: "center" } },
        { element: "[data-onboarding-nav]", popover: { title: "Navigation", description: "Switch between Chat, Profile, Documents, and Calls.", side: "bottom", align: "center" } },
        { element: "[data-onboarding-chat]", popover: { title: "Chat", description: "Talk to the AI assistant.", side: "right", align: "start" } },
        { element: "[data-onboarding-profile]", popover: { title: "Profile", description: "View and update your profile.", side: "right", align: "start" } },
        { element: "[data-onboarding-documents]", popover: { title: "Documents", description: "Manage documents. Coming soon.", side: "right", align: "start" } },
        { element: "[data-onboarding-calls]", popover: { title: "Calls", description: "Voice calls with LiveKit.", side: "right", align: "start" } },
        { element: "body", popover: { title: "All set!", description: "Explore the dashboard.", side: "bottom", align: "center" } },
      ],
      onDestroyed: () => onComplete(),
    });
    driverObj.drive();
    return () => driverObj.destroy();
  }, [onComplete]);
  return null;
}
