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
        { element: "body", popover: { title: "Welcome to UFCi", description: "This is your main workspace. Chat is front and center.", side: "bottom", align: "center" } },
        { element: "[data-onboarding-chat]", popover: { title: "Chat", description: "Send messages here. Everything flows through chat.", side: "right", align: "start" } },
        { element: "[data-onboarding-modes]", popover: { title: "Modes", description: "Switch between Messenger, Customer Service, Appointments, and more.", side: "top", align: "center" } },
        { element: "body", popover: { title: "All set!", description: "Use the documents icon to upload files. Click your name for Profile.", side: "bottom", align: "center" } },
      ],
      onDestroyed: () => onComplete(),
    });
    driverObj.drive();
    return () => driverObj.destroy();
  }, [onComplete]);
  return null;
}
