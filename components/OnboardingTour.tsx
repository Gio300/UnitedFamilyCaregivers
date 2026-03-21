"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface OnboardingTourProps {
  onComplete: () => void;
  onOpenSettings?: () => void;
}

export function OnboardingTour({ onComplete, onOpenSettings }: OnboardingTourProps) {
  useEffect(() => {
    const driverObj = driver({
      showProgress: true,
      steps: [
        {
          element: "[data-onboarding-settings]",
          popover: {
            title: "Let's adjust your view",
            description: "Click the Settings button above to open it. Adjust text size and page zoom with the sliders until everything feels comfortable. Changes apply instantly. Then click Next to continue.",
            side: "bottom",
            align: "center",
          },
          onHighlightStarted: () => {
            onOpenSettings?.();
          },
        },
        { element: "[data-onboarding-chat]", popover: { title: "Chat", description: "Send messages here. Chat adapts to your role (client, caregiver, admin).", side: "right", align: "start" } },
        { element: "body", popover: { title: "All set!", description: "Use the bell icon for Message Center. Documents icon for uploads. Click your name for Profile.", side: "bottom", align: "center" } },
      ],
      onDestroyed: () => onComplete(),
    });
    driverObj.drive();
    return () => driverObj.destroy();
  }, [onComplete, onOpenSettings]);
  return null;
}
