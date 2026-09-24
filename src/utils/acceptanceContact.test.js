import { describe, expect, it } from "vitest";
import { prefillAcceptanceContact } from "./acceptanceContact.js";

describe("acceptance contact prefill", () => {
  const report = {
    inviteMeta: {
      projectContact: { name: "Ron Bevel", company: "Acme", email: "ron@example.com" },
      installContact: { name: "Installer", phone: "414-555-0100" },
    },
    sharedSite: { customerContact: "Site manager | 414-555-0199" },
  };

  it("copies available setup fields but preserves certificate-specific edits", () => {
    const result = prefillAcceptanceContact({ customerContactName: "Different signer", customerContactPhone: "" }, report);
    expect(result).toMatchObject({
      customerContactName: "Different signer",
      customerContactPhone: "414-555-0100",
      customerContactEmail: "ron@example.com",
      customerCompany: "Acme",
      contactPrefillComplete: true,
    });
    expect(prefillAcceptanceContact({ ...result, customerContactName: "" }, report).customerContactName).toBe("");
  });

  it("uses manual site contact when an invitation has no contacts", () => {
    expect(prefillAcceptanceContact({}, { sharedSite: report.sharedSite })).toMatchObject({
      customerContactName: "Site manager", customerContactPhone: "414-555-0199",
    });
  });
});
