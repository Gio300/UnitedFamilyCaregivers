# Sandata EVV — checklist steps → mapper fields

Guided flow in `ai-gateway/mcp-flow.js` collects **session-only** answers keyed for alignment with the archived integration:

- [`archives/sandata-evv-api/services/sandata-client.js`](../archives/sandata-evv-api/services/sandata-client.js) — `mapClientToSandata`
- [`archives/sandata-evv-api/services/sandata-employees.js`](../archives/sandata-evv-api/services/sandata-employees.js) — `mapEmployeeToSandata`
- [`archives/sandata-evv-api/services/sandata-visits.js`](../archives/sandata-evv-api/services/sandata-visits.js) — `mapVisitToSandata`

| Flow answer keys (examples) | Sandata / ops use |
|----------------------------|-------------------|
| `ClientMedicaidID_source` | Confirms ID is ready before `ClientMedicaidID` on POST |
| `PayerID`, `PayerProgram`, `ProcedureCode` | `ClientPayerInformation` row; visit service combo (UPPERCASE codes) |
| `PayerProgram` = PCS / HH / WAIVER | API department shape; full `NVFFS PCS` style from mapper |
| `prereq_status` | Ops: client/employee loaded before visits |
| `address_phone_ok` | Prompts for `ClientAddress` / `ClientPhone` valid types (Home, Mobile, Business, Other) |
| `id_path` (eligibility flow) | In-app eligibility vs Sandata payer row (documented in copy) |
| `sandata_handoff_ack` | User acknowledged Program Resources / portal path |

**Load order** enforced in copy: client (+ payer row) → employee → visit (Calls In/Out on first post).

**Supabase:** v1 does not persist `flowContext.answers`. Phase 2: map into `client_profiles` or dedicated columns and call sync API.

See also [`archives/sandata-evv-api/docs/nevada-services.md`](../archives/sandata-evv-api/docs/nevada-services.md).
