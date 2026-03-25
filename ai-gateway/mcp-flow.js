/**
 * Sandata-aligned EVV checklist flow for /api/mcp.
 * Field names mirror archives/sandata-evv-api/services/sandata-client.js (clients),
 * sandata-employees.js, sandata-visits.js. See docs/SANDATA_FLOW_FIELD_MAP.md in repo.
 */

const FLOW_PREFIX = "__FLOW__:";

const START_CHECKLIST_RE =
  /^\s*(start\s+checklist|evv\s+checklist|compliance\s+checklist|sandata\s+checklist)\s*$/i;

function mapModeToFlowId(mode) {
  if (mode === "evv") return "evv";
  if (mode === "customer_service") return "customer_service";
  if (mode === "eligibility") return "eligibility";
  return "general";
}

function emptyContext() {
  return {
    flowId: null,
    stepId: null,
    answers: {},
    skipped: [],
    awaitingTypedReply: false,
    typedReplyResumeStep: null,
    completed: false,
  };
}

function parseControlMessage(message) {
  const m = (message || "").trim();
  if (!m.startsWith(FLOW_PREFIX)) return null;
  try {
    return JSON.parse(m.slice(FLOW_PREFIX.length));
  } catch {
    return null;
  }
}

function cloneCtx(ctx) {
  if (!ctx) return emptyContext();
  return {
    flowId: ctx.flowId ?? null,
    stepId: ctx.stepId ?? null,
    answers: { ...(ctx.answers || {}) },
    skipped: [...(ctx.skipped || [])],
    awaitingTypedReply: !!ctx.awaitingTypedReply,
    typedReplyResumeStep: ctx.typedReplyResumeStep ?? null,
    completed: !!ctx.completed,
  };
}

/** @type {Record<string, { label: string, steps: Record<string, any> }>} */
const FLOWS = {
  evv: {
    label: "EVV / Sandata readiness",
    steps: {
      intro: {
        prompt:
          "Quick EVV pass — Nevada Sandata order is: **client (with payer row) → employee → visit**. First visit post needs **Call In and Out**. Codes and modifiers stay **UPPERCASE**. This is ops guidance, not legal advice.\n\nYou good to walk through?",
        sandataKeys: [],
        options: [
          { id: "yes", label: "Run the checklist", next: "client_context" },
          { id: "exit", label: "Not now", exit: true },
        ],
      },
      client_context: {
        prompt:
          "For **ClientMedicaidID** in Sandata: do you have the member locked in (Profiles) or the ID in hand?",
        sandataKeys: ["ClientMedicaidID"],
        options: [
          {
            id: "profile",
            label: "Client selected in app",
            next: "payer_row",
            setAnswer: { ClientMedicaidID_source: "app_profile" },
          },
          {
            id: "id_ready",
            label: "I have the Medicaid ID",
            next: "payer_row",
            setAnswer: { ClientMedicaidID_source: "manual" },
          },
          {
            id: "other",
            label: "Other — I'll type it",
            other: true,
            otherResumeNext: "payer_row",
          },
        ],
      },
      payer_row: {
        prompt:
          "**ClientPayerInformation** needs a valid combo: **PayerID** (NVFFS, NVANT, NVMOL, NVHPN, NVSIL, NVCAR — or numeric from Sandata Program Resources), **PayerProgram** department (**PCS**, **HH**, **WAIVER**), **ProcedureCode** (e.g. T1019 PCS). Which lane?",
        sandataKeys: ["PayerID", "PayerProgram", "ProcedureCode"],
        options: [
          {
            id: "pcs_ffs",
            label: "PCS — NVFFS-style FFS",
            next: "employee_visit",
            setAnswer: { PayerID: "NVFFS", PayerProgram: "PCS", ProcedureCode: "T1019" },
          },
          {
            id: "pcs_mco",
            label: "PCS — MCO (Anthem/Molina/etc.)",
            next: "employee_visit",
            setAnswer: { PayerProgram: "PCS", ProcedureCode: "T1019", PayerID: "MCO" },
          },
          {
            id: "hh",
            label: "Home Health (HH)",
            next: "employee_visit",
            setAnswer: { PayerProgram: "HH", ProcedureCode: "T1002" },
          },
          {
            id: "waiver",
            label: "Waiver (NVFFS WAIVER)",
            next: "employee_visit",
            setAnswer: { PayerID: "NVFFS", PayerProgram: "WAIVER", ProcedureCode: "S5125" },
          },
          { id: "skip_payer", label: "Skip — I'll confirm in portal", next: "employee_visit", skip: true },
        ],
      },
      employee_visit: {
        prompt:
          "Before **visits**: **Employee** must load (10-digit **EmployeeIdentifier** / NPI-style, **EmployeeOtherID**, name). Visits need **ScheduleStart/End**, **Call In/Out** on first submit, **VisitTimeZone** (e.g. US/Pacific), and matching payer/program/procedure.\n\nWhere are you at?",
        sandataKeys: ["EmployeeIdentifier", "VisitOtherID", "CallIn", "CallOut"],
        options: [
          {
            id: "both_ready",
            label: "Client + employee already in Sandata",
            next: "recap",
            setAnswer: { prereq_status: "loaded" },
          },
          {
            id: "client_only",
            label: "Client only — still need employee",
            next: "recap",
            setAnswer: { prereq_status: "client_only" },
          },
          {
            id: "neither",
            label: "Still setting both up",
            next: "recap",
            setAnswer: { prereq_status: "in_progress" },
          },
        ],
      },
      recap: {
        prompt: "", // filled by templateRecap
        sandataKeys: [],
        templateRecap: true,
        options: [
          { id: "done", label: "Done — thanks", next: null, finish: true },
          { id: "again", label: "Run again", next: "intro", resetAnswers: true },
        ],
      },
    },
  },
  customer_service: {
    label: "Intake / client service",
    steps: {
      intro: {
        prompt:
          "Intake lane — same Sandata truth: we need a clean **client row** (Medicaid ID, address types, payer line with **UPPERCASE** procedure/modifiers) before visits bill.\n\nStart?",
        sandataKeys: [],
        options: [
          { id: "yes", label: "Let's go", next: "client_context" },
          { id: "exit", label: "Not now", exit: true },
        ],
      },
      client_context: {
        prompt: "Do you have **ClientMedicaidID** via Profiles or paperwork?",
        sandataKeys: ["ClientMedicaidID"],
        options: [
          {
            id: "profile",
            label: "Selected in Profiles",
            next: "address_phone",
            setAnswer: { ClientMedicaidID_source: "app_profile" },
          },
          {
            id: "paper",
            label: "From paperwork / eligibility",
            next: "address_phone",
            setAnswer: { ClientMedicaidID_source: "paperwork" },
          },
          { id: "other", label: "Other — I'll explain", other: true, otherResumeNext: "address_phone" },
        ],
      },
      address_phone: {
        prompt:
          "Sandata **ClientAddressType** / **ClientPhoneType** must be Home, Mobile, Business, or Other (not “Cell”/“Work” — we normalize, but enter clean). Primary home address with county/ZIP is typical.\n\nData look current?",
        sandataKeys: ["ClientAddress", "ClientPhone"],
        options: [
          { id: "yes", label: "Yes — verified", next: "payer_row", setAnswer: { address_phone_ok: true } },
          { id: "fix", label: "Need to update in Profiles", next: "payer_row", setAnswer: { address_phone_ok: false } },
          { id: "skip", label: "Skip for now", next: "payer_row", skip: true },
        ],
      },
      payer_row: {
        prompt: "Confirm **payer program line** for this member (PCS vs HH vs Waiver + procedure).",
        sandataKeys: ["PayerID", "PayerProgram", "ProcedureCode"],
        options: [
          {
            id: "pcs",
            label: "PCS (T1019 typical)",
            next: "recap",
            setAnswer: { PayerProgram: "PCS", ProcedureCode: "T1019" },
          },
          {
            id: "hh",
            label: "Home Health",
            next: "recap",
            setAnswer: { PayerProgram: "HH" },
          },
          {
            id: "waiver",
            label: "Waiver",
            next: "recap",
            setAnswer: { PayerProgram: "WAIVER" },
          },
        ],
      },
      recap: {
        prompt: "",
        sandataKeys: [],
        templateRecap: true,
        options: [
          { id: "done", label: "Done", next: null, finish: true },
          { id: "again", label: "Again", next: "intro", resetAnswers: true },
        ],
      },
    },
  },
  eligibility: {
    label: "Eligibility + Sandata handoff",
    steps: {
      intro: {
        prompt:
          "Eligibility checks **recipient/SSN + DOB** in our tool. Sandata still needs the **payer row** (PayerID / PayerProgram / ProcedureCode) on the client — same member, two stops.\n\nContinue?",
        sandataKeys: [],
        options: [
          { id: "yes", label: "Continue", next: "ids" },
          { id: "exit", label: "Not now", exit: true },
        ],
      },
      ids: {
        prompt: "Do you have **recipient ID** or **SSN** + DOB for the check?",
        sandataKeys: ["recipientId", "ssn"],
        options: [
          { id: "recipient", label: "Recipient ID path", next: "sandata_handoff", setAnswer: { id_path: "recipientId" } },
          { id: "ssn", label: "SSN path", next: "sandata_handoff", setAnswer: { id_path: "ssn" } },
        ],
      },
      sandata_handoff: {
        prompt:
          "After eligibility: add/update **ClientPayerInformation** in Sandata with the **exact** program + **UPPERCASE** HCPCS/modifiers from the spec. Portal: **evv-registration.sandata.com** → Program Resources for numeric PayerID if needed.",
        sandataKeys: ["PayerID", "PayerProgram", "ProcedureCode"],
        options: [
          { id: "got_it", label: "Got it", next: "recap", setAnswer: { sandata_handoff_ack: true } },
        ],
      },
      recap: {
        prompt: "",
        sandataKeys: [],
        templateRecap: true,
        options: [
          { id: "done", label: "Done", next: null, finish: true },
          { id: "again", label: "Again", next: "intro", resetAnswers: true },
        ],
      },
    },
  },
  general: {
    label: "Sandata checklist",
    steps: {
      intro: {
        prompt:
          "General **Sandata EVV** checklist (Nevada): load **client** with payer row → **employee** → **visit** with Calls In/Out on first post. Procedure codes + modifiers **UPPERCASE**.\n\nRun it?",
        sandataKeys: [],
        options: [
          { id: "yes", label: "Yes", next: "client_context" },
          { id: "exit", label: "Not now", exit: true },
        ],
      },
      client_context: {
        prompt: "**ClientMedicaidID** ready?",
        sandataKeys: ["ClientMedicaidID"],
        options: [
          { id: "yes", label: "Yes", next: "order", setAnswer: { ClientMedicaidID_source: "ready" } },
          { id: "other", label: "Other", other: true, otherResumeNext: "order" },
        ],
      },
      order: {
        prompt: "Remember order: **client → employee → visit**.",
        sandataKeys: [],
        options: [{ id: "ok", label: "OK — wrap up", next: "recap", setAnswer: { order_ok: true } }],
      },
      recap: {
        prompt: "",
        sandataKeys: [],
        templateRecap: true,
        options: [
          { id: "done", label: "Done", next: null, finish: true },
          { id: "again", label: "Again", next: "intro", resetAnswers: true },
        ],
      },
    },
  },
};

function templateRecap(flowId, answers) {
  const lines = ["**Locked in for this session (Sandata-shaped):**"];
  const entries = Object.entries(answers || {});
  if (entries.length === 0) lines.push("- (nothing captured — skipped or still in progress)");
  else {
    for (const [k, v] of entries) {
      if (v === undefined || v === null) continue;
      lines.push(`- **${k}:** ${typeof v === "object" ? JSON.stringify(v) : v}`);
    }
  }
  lines.push(
    "",
    "Operational reminder — confirm against **Program Resources** and the NV-DHCFP spec before you submit."
  );
  return lines.join("\n");
}

function buildQuickReplies(flowId, stepId, options) {
  if (!options || !options.length) return [];
  return options.map((o) => ({
    id: o.id,
    label: o.label,
    payload: `${FLOW_PREFIX}${JSON.stringify({
      action: "select",
      flowId,
      stepId,
      optionId: o.id,
    })}`,
  }));
}

function getStep(flowId, stepId) {
  const flow = FLOWS[flowId];
  if (!flow) return null;
  return flow.steps[stepId] || null;
}

async function handleTypedReply(flowAssist, flowId, resumeStepId, message, answers, userContext) {
  if (typeof flowAssist !== "function") {
    return {
      response:
        "Couldn't reach AI for that. Pick an option below or try again.",
      answers,
      nextStepId: resumeStepId,
    };
  }
  const step = getStep(flowId, resumeStepId);
  const sandataKeys = step?.sandataKeys || [];
  try {
    const out = await flowAssist({
      userMessage: message,
      flowId,
      resumeStepId,
      sandataKeys,
      answers,
      userContext,
    });
    const merged = { ...answers, ...(out.extracted && typeof out.extracted === "object" ? out.extracted : {}) };
    return {
      response: out.assistant_message || "Got it. Moving you forward.",
      answers: merged,
      nextStepId:
        out.next_step_id && getStep(flowId, out.next_step_id)
          ? out.next_step_id
          : resumeStepId,
    };
  } catch {
    return {
      response: "AI hiccup — use the buttons or rephrase.",
      answers,
      nextStepId: resumeStepId,
    };
  }
}

/**
 * @returns {Promise<{ handled: boolean, response?: string, quickReplies?: any[], flowContext?: object, source?: string, matched?: boolean }>}
 */
async function handleMcpFlow({
  message,
  flowContext: incomingCtx,
  userContext,
  flowAssist,
}) {
  const control = parseControlMessage(message);
  let ctx = cloneCtx(incomingCtx);

  const plain = (message || "").trim();

  // Start from phrase
  if (!ctx.flowId && !control && START_CHECKLIST_RE.test(plain)) {
    const fid = mapModeToFlowId(userContext?.mode);
    ctx = emptyContext();
    ctx.flowId = fid;
    ctx.stepId = "intro";
    const step = getStep(ctx.flowId, ctx.stepId);
    if (!step) return { handled: false };
    const prompt =
      step.templateRecap && step.prompt === ""
        ? templateRecap(ctx.flowId, ctx.answers)
        : step.prompt;
    return {
      handled: true,
      response: prompt,
      quickReplies: buildQuickReplies(ctx.flowId, ctx.stepId, step.options),
      flowContext: ctx,
      source: "mcp-flow",
      matched: true,
    };
  }

  // __FLOW__ control
  if (control) {
    if (control.action === "start") {
      ctx = emptyContext();
      ctx.flowId = control.flowId || mapModeToFlowId(userContext?.mode);
      ctx.stepId = "intro";
      const step = getStep(ctx.flowId, ctx.stepId);
      if (!step) return { handled: true, response: "Unknown flow.", flowContext: emptyContext(), source: "mcp-flow", matched: true };
      const prompt =
        step.templateRecap && step.prompt === ""
          ? templateRecap(ctx.flowId, ctx.answers)
          : step.prompt;
      return {
        handled: true,
        response: prompt,
        quickReplies: buildQuickReplies(ctx.flowId, ctx.stepId, step.options),
        flowContext: ctx,
        source: "mcp-flow",
        matched: true,
      };
    }

    if (control.action === "exit" || control.action === "dismiss") {
      return {
        handled: true,
        response: "Checklist closed. Chat normally anytime.",
        quickReplies: [],
        flowContext: { ...emptyContext(), completed: true },
        source: "mcp-flow",
        matched: true,
      };
    }

    if (control.action === "select" && control.flowId && control.stepId && control.optionId) {
      ctx.flowId = control.flowId;
      ctx.stepId = control.stepId;
      const step = getStep(ctx.flowId, ctx.stepId);
      if (!step) return { handled: true, response: "Step expired. Say **start checklist** to begin again.", flowContext: emptyContext(), source: "mcp-flow", matched: true };
      const opt = (step.options || []).find((o) => o.id === control.optionId);
      if (!opt) {
        return {
          handled: true,
          response: "That option’s gone — here’s the step again.",
          quickReplies: buildQuickReplies(ctx.flowId, ctx.stepId, step.options),
          flowContext: ctx,
          source: "mcp-flow",
          matched: true,
        };
      }
      if (opt.exit) {
        return {
          handled: true,
          response: "No problem — ping me when you’re ready.",
          quickReplies: [],
          flowContext: { ...emptyContext(), completed: true },
          source: "mcp-flow",
          matched: true,
        };
      }
      if (opt.resetAnswers) {
        ctx.answers = {};
      }
      if (opt.setAnswer) {
        ctx.answers = { ...ctx.answers, ...opt.setAnswer };
      }
      if (opt.resetAnswers) {
        ctx.answers = {};
      }
      if (opt.skip) {
        ctx.skipped = [...(ctx.skipped || []), ctx.stepId];
      }
      if (opt.other) {
        ctx.awaitingTypedReply = true;
        ctx.typedReplyResumeStep = ctx.stepId;
        return {
          handled: true,
          response:
            "Say it how you need — Medicaid ID, payer, or what’s messy. I’ll fold it in and move you forward.",
          quickReplies: [
            {
              id: "back",
              label: "Back to choices",
              payload: `${FLOW_PREFIX}${JSON.stringify({
                action: "cancel_other",
                flowId: ctx.flowId,
                stepId: ctx.stepId,
              })}`,
            },
          ],
          flowContext: ctx,
          source: "mcp-flow",
          matched: true,
        };
      }
      if (opt.finish || opt.next === null) {
        ctx.completed = true;
        const recap = templateRecap(ctx.flowId, ctx.answers);
        return {
          handled: true,
          response: `**Checklist complete.**\n\n${recap}`,
          quickReplies: [],
          flowContext: { ...emptyContext(), completed: true, answers: ctx.answers },
          source: "mcp-flow",
          matched: true,
        };
      }
      const nextId = opt.next;
      ctx.stepId = nextId;
      ctx.awaitingTypedReply = false;
      ctx.typedReplyResumeStep = null;
      const nextStep = getStep(ctx.flowId, ctx.stepId);
      if (!nextStep) {
        ctx.completed = true;
        return {
          handled: true,
          response: templateRecap(ctx.flowId, ctx.answers),
          quickReplies: [],
          flowContext: { ...emptyContext(), completed: true, answers: ctx.answers },
          source: "mcp-flow",
          matched: true,
        };
      }
      const prompt =
        nextStep.templateRecap && nextStep.prompt === ""
          ? templateRecap(ctx.flowId, ctx.answers)
          : nextStep.prompt;
      return {
        handled: true,
        response: prompt,
        quickReplies: buildQuickReplies(ctx.flowId, ctx.stepId, nextStep.options),
        flowContext: ctx,
        source: "mcp-flow",
        matched: true,
      };
    }

    if (control.action === "cancel_other") {
      ctx.awaitingTypedReply = false;
      ctx.typedReplyResumeStep = null;
      const step = getStep(control.flowId, control.stepId);
      if (!step) return { handled: true, response: "Flow reset.", flowContext: emptyContext(), source: "mcp-flow", matched: true };
      ctx.flowId = control.flowId;
      ctx.stepId = control.stepId;
      return {
        handled: true,
        response: step.prompt,
        quickReplies: buildQuickReplies(ctx.flowId, ctx.stepId, step.options),
        flowContext: ctx,
        source: "mcp-flow",
        matched: true,
      };
    }
  }

  // Active flow: typed reply while awaiting Other
  if (ctx.flowId && ctx.awaitingTypedReply && ctx.typedReplyResumeStep && plain && !plain.startsWith(FLOW_PREFIX)) {
    const resume = ctx.typedReplyResumeStep;
    const optOther = (getStep(ctx.flowId, resume)?.options || []).find((o) => o.other);
    const fallbackNext = optOther?.otherResumeNext || "payer_row";
    const typed = await handleTypedReply(flowAssist, ctx.flowId, resume, plain, ctx.answers, userContext);
    ctx.answers = typed.answers;
    ctx.awaitingTypedReply = false;
    ctx.typedReplyResumeStep = null;
    ctx.stepId = typed.nextStepId || fallbackNext;
    const nextStep = getStep(ctx.flowId, ctx.stepId);
    if (!nextStep) {
      ctx.completed = true;
      return {
        handled: true,
        response: typed.response,
        quickReplies: [],
        flowContext: { ...emptyContext(), completed: true, answers: ctx.answers },
        source: "mcp-flow",
        matched: true,
      };
    }
    const promptAfter =
      typed.response +
      "\n\n---\n\n" +
      (nextStep.templateRecap && nextStep.prompt === ""
        ? templateRecap(ctx.flowId, ctx.answers)
        : nextStep.prompt);
    return {
      handled: true,
      response: promptAfter,
      quickReplies: buildQuickReplies(ctx.flowId, ctx.stepId, nextStep.options),
      flowContext: ctx,
      source: "mcp-flow",
      matched: true,
    };
  }

  // Active incomplete flow without control: free text → flowAssist then stay on step
  if (
    ctx.flowId &&
    ctx.stepId &&
    !ctx.completed &&
    plain &&
    !plain.startsWith(FLOW_PREFIX) &&
    !START_CHECKLIST_RE.test(plain)
  ) {
    const step = getStep(ctx.flowId, ctx.stepId);
    if (step && step.options?.length) {
      const typed = await handleTypedReply(flowAssist, ctx.flowId, ctx.stepId, plain, ctx.answers, userContext);
      ctx.answers = typed.answers;
      return {
        handled: true,
        response:
          typed.response +
          "\n\nPick what fits best, or keep typing.",
        quickReplies: buildQuickReplies(ctx.flowId, ctx.stepId, step.options),
        flowContext: ctx,
        source: "mcp-flow",
        matched: true,
      };
    }
  }

  return { handled: false };
}

module.exports = {
  handleMcpFlow,
  parseControlMessage,
  FLOW_PREFIX,
  emptyContext,
  mapModeToFlowId,
  FLOWS,
};
