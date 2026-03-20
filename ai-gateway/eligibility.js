/**
 * Nevada Medicaid Eligibility - TOTP and Open Portal
 * TOTP requires otplib. Open-portal requires playwright + nevada-medicaid-agent.
 */
function getTotpCode() {
  try {
    const { authenticator } = require("otplib");
    const secret = process.env.NEVADA_MEDICAID_TOTP_SECRET;
    if (!secret) return null;
    return authenticator.generate(secret);
  } catch (e) {
    return null;
  }
}

async function openPortal() {
  try {
    const path = require("path");
    const agentPath = path.join(__dirname, "..", "..", "backend", "services", "nevada-medicaid-agent");
    const agent = require(agentPath);
    return agent.openPortalForManualCheck();
  } catch (e) {
    return {
      success: false,
      error: "Open portal requires playwright and Nevada Medicaid credentials. Set NEVADA_MEDICAID_USER_ID, NEVADA_MEDICAID_PASSWORD, NEVADA_MEDICAID_TOTP_SECRET.",
    };
  }
}

async function checkEligibility(params) {
  try {
    const path = require("path");
    const agentPath = path.join(__dirname, "..", "..", "backend", "services", "nevada-medicaid-agent");
    const agent = require(agentPath);
    return agent.checkEligibility(params);
  } catch (e) {
    return {
      success: false,
      error: e.message || "Eligibility check failed.",
      humanFallbackRequired: true,
    };
  }
}

module.exports = { getTotpCode, openPortal, checkEligibility };
