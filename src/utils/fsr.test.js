import { describe, expect, it } from "vitest";
import {
  addEntryWithEffects,
  ACCEPTANCE_CERT_DOC_NAME,
  ACCEPTANCE_CERT_LEGACY_NAMES,
  buildReportHtml,
  computeDowntimeMinutes,
  ensureAcceptanceCertificationData,
  ensureFsrDocData,
  ensureMotorTestData,
  loadReports,
  makeDocs,
  makeEmptyAcceptanceCertificationData,
  makeEmptyMotorTestData,
  mergePartsNeeded,
  MOTOR_TEST_DOC_NAME,
  MOTOR_TEST_LEGACY_NAMES,
} from "./fsr";

const baseReportInfo = {
  id: "r1",
  jobNo: "J#1234",
  tripType: "Service",
  model: "M",
  startAt: new Date("2024-01-01T08:00:00Z").toISOString(),
  endAt: new Date("2024-01-01T10:00:00Z").toISOString(),
  serialTagImageUrl: "data:image/png;base64,serial",
  serialTagMissing: false,
};

const issueEntry = {
  id: "entry-issue",
  type: "issue",
  note: "Cleared alarms & checked <safety>",
  photos: [
    { id: "issue-photo-1", imageUrl: "data:image/png;base64,issue1" },
    { id: "issue-photo-2", imageUrl: "data:image/png;base64,issue2" },
  ],
  createdAt: new Date("2024-01-01T08:30:00Z").toISOString(),
  collapsed: false,
};

const correctionEntry = {
  id: "entry-correction",
  type: "correction",
  note: "Replaced limit switch and verified operation.",
  photos: [{ id: "correction-photo", imageUrl: "data:image/png;base64,correction" }],
  createdAt: new Date("2024-01-01T09:00:00Z").toISOString(),
  collapsed: false,
};

const orderPartsEntry = {
  id: "entry-parts",
  type: "orderParts",
  note: "Ship to job site.",
  parts: [
    { id: "part-1", partNo: "123", desc: "Photo eye", qty: "2" },
    { id: "part-2", partNo: "456", desc: "Controller", qty: "1" },
  ],
  createdAt: new Date("2024-01-01T09:15:00Z").toISOString(),
  collapsed: false,
};

const docRequestEntry = {
  id: "entry-doc",
  type: "docRequest",
  docKind: "pm",
  docNotes: "Need the most recent checklist.",
  createdAt: new Date("2024-01-01T09:20:00Z").toISOString(),
  collapsed: false,
};

const followUpEntry = {
  id: "entry-follow",
  type: "followUp",
  followUp: { title: "Schedule revisit", details: "Return in two weeks with replacement actuator." },
  createdAt: new Date("2024-01-01T09:30:00Z").toISOString(),
  collapsed: false,
};

const commentaryEntry = {
  id: "entry-commentary",
  type: "commentary",
  note: "Unit is operating smoothly after service.",
  createdAt: new Date("2024-01-01T09:45:00Z").toISOString(),
  collapsed: false,
};

const internalEntry = {
  id: "entry-internal",
  type: "internal",
  note: "Customer requested discount — do not include in export.",
  createdAt: new Date("2024-01-01T09:50:00Z").toISOString(),
  collapsed: false,
};

const makeReport = (entries) => ({
  ...baseReportInfo,
  documents: [
    {
      id: "d1",
      name: "Field Service Report",
      done: true,
      data: ensureFsrDocData({ entries }),
    },
  ],
  photos: [
    {
      id: "p1",
      imageUrl: "data:image/png;base64,photo",
      caption: "Overview of lift",
    },
  ],
});

describe("entry helpers", () => {
  it("adds entries of each type and updates details", () => {
    let data = ensureFsrDocData({});
    data = addEntryWithEffects(data, issueEntry);
    data = addEntryWithEffects(data, correctionEntry);
    data = addEntryWithEffects(data, orderPartsEntry);
    data = addEntryWithEffects(data, docRequestEntry);
    data = addEntryWithEffects(data, followUpEntry);
    data = addEntryWithEffects(data, commentaryEntry);
    data = addEntryWithEffects(data, internalEntry);

    expect(data.entries.map((entry) => entry.type)).toEqual([
      "issue",
      "correction",
      "orderParts",
      "docRequest",
      "followUp",
      "commentary",
      "internal",
    ]);
    expect(data.issues.length).toBe(1);
    expect(data.details.partsNeeded).toHaveLength(2);
    expect(data.details.partsNeeded.map((item) => item.text)).toContain("123 — Photo eye (Qty 2)");
    expect(data.details.partsNeeded.map((item) => item.text)).toContain("456 — Controller (Qty 1)");
  });
});

describe("mergePartsNeeded", () => {
  it("dedupes parts by part number and description and sums quantity", () => {
    const existing = [{ id: "manual-1", text: "Custom shim" }];
    const entries = [
      {
        type: "orderParts",
        parts: [
          { id: "p1", partNo: "100", desc: "Sensor", qty: "1" },
          { id: "p2", partNo: "200", desc: "Controller", qty: "2" },
        ],
      },
      {
        type: "orderParts",
        parts: [{ id: "p3", partNo: "100", desc: "Sensor", qty: "2" }],
      },
    ];

    const merged = mergePartsNeeded(existing, entries);
    expect(merged).toHaveLength(3);
    expect(merged[0].text).toBe("100 — Sensor (Qty 3)");
    expect(merged[1].text).toBe("200 — Controller (Qty 2)");
    expect(merged[2].text).toBe("Custom shim");

    const rerun = mergePartsNeeded(merged, entries);
    expect(rerun[0].text).toBe("100 — Sensor (Qty 3)");
    expect(rerun).toHaveLength(3);
  });
});

describe("computeDowntimeMinutes", () => {
  it("handles DST spring forward without negative values", () => {
    const start = "2024-03-10T01:30:00-06:00"; // CST before DST jump
    const end = "2024-03-10T03:30:00-05:00"; // CDT after jump
    const minutes = computeDowntimeMinutes(start, end);
    expect(minutes).toBe(60);
    expect(Number.isInteger(minutes)).toBe(true);
    expect(minutes).toBeGreaterThanOrEqual(0);
  });
});

describe("buildReportHtml", () => {
  it("creates a printable document with key sections", () => {
    const report = makeReport([
      issueEntry,
      correctionEntry,
      orderPartsEntry,
      docRequestEntry,
      followUpEntry,
      commentaryEntry,
    ]);

    const html = buildReportHtml(report);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Field Service Report");
    expect(html).toContain(report.jobNo);
    expect(html).toContain("Documents");
    expect(html).toContain("Core Details");
    expect(html).toContain("Parts Needed");
    expect(html).toContain("Corrections");
    expect(html).toContain("Document Requests");
    expect(html).toContain("Follow-Ups");
    expect(html).toContain("Issues");
    expect(html).toContain("Field Pictures");
    expect(html).toContain("<td>123</td>");
    expect(html).toContain("<td>Photo eye</td>");
    expect(html).toContain("Cleared alarms &amp; checked &lt;safety&gt;");
  });

  it("excludes internal entries from export output", () => {
    const report = makeReport([commentaryEntry, internalEntry, issueEntry]);
    const html = buildReportHtml(report);

    expect(html).toContain("Commentary #1");
    expect(html).not.toContain("Customer requested discount");
  });

  it("renders multiple photos for a single issue entry", () => {
    const report = makeReport([issueEntry]);
    const html = buildReportHtml(report);
    const photoMatches = html.match(/Issue photo \d+/g) || [];
    expect(photoMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("renders a photo grid for corrections with multiple photos", () => {
    const multiCorrection = {
      ...correctionEntry,
      id: "entry-correction-grid",
      photos: [
        { id: "corr-1", imageUrl: "data:image/png;base64,corr1" },
        { id: "corr-2", imageUrl: "data:image/png;base64,corr2" },
      ],
    };
    const report = makeReport([multiCorrection]);
    const html = buildReportHtml(report);
    const matches = html.match(/Correction photo \d+/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("injects current user details into the header", () => {
    const report = makeReport([]);
    const html = buildReportHtml(report, { name: "Alex Tech", email: "alex@pflow.com" });
    expect(html).toContain("Alex Tech — Field Service Tech");
    expect(html).toContain("alex@pflow.com");
  });

  it("includes motor test data only when populated", () => {
    const baseReport = {
      ...baseReportInfo,
      tripType: "Start Up",
      sharedSite: {
        jobName: "Galaxy Tower",
        serialNumberText: "M-1000",
        siteStreetAddress: "100 State St",
        siteCity: "Milwaukee",
        siteState: "WI",
        siteZip: "53202",
      },
      documents: [
        {
          id: "fsr",
          name: "Field Service Report",
          done: false,
          data: ensureFsrDocData({ entries: [] }),
        },
        {
          id: "motor-empty",
          name: MOTOR_TEST_DOC_NAME,
          done: false,
          data: makeEmptyMotorTestData(),
        },
      ],
      photos: [],
    };

    const withoutDataHtml = buildReportHtml(baseReport);
    expect(withoutDataHtml).not.toContain(
      `<div class="section-title">${MOTOR_TEST_DOC_NAME}</div>`,
    );

    const populatedData = ensureMotorTestData({
      jobName: "Galaxy Tower",
      pflowSerialNumber: "M-1000",
      modelNumber: "21",
      ratedLoad: "4000",
      motor: { manufacturer: "ACME", serialNumber: "SN-1" },
      voltIncoming: { l1l2: "480", l1l3: "478", l2l3: "481" },
    });

    const withDataHtml = buildReportHtml({
      ...baseReport,
      documents: [
        baseReport.documents[0],
        {
          id: "motor",
          name: MOTOR_TEST_DOC_NAME,
          done: false,
          data: populatedData,
        },
      ],
    });

    expect(withDataHtml).toContain(
      `<div class="section-title">${MOTOR_TEST_DOC_NAME}</div>`,
    );
    expect(withDataHtml).toContain("Rated Load");
    expect(withDataHtml).toContain("Galaxy Tower");
    expect(withDataHtml).toContain("ACME");
  });

  it("includes the acceptance certification section when populated", () => {
    const report = {
      ...baseReportInfo,
      tripType: "Start Up",
      sharedSite: {
        jobName: "Galaxy Tower",
        serialNumberText: "M-1000",
        siteStreetAddress: "100 State St",
        siteCity: "Milwaukee",
        siteState: "WI",
        siteZip: "53202",
      },
      documents: [
        {
          id: "fsr",
          name: "Field Service Report",
          done: false,
          data: ensureFsrDocData({ entries: [] }),
        },
        {
          id: "acceptance",
          name: ACCEPTANCE_CERT_DOC_NAME,
          done: false,
          data: ensureAcceptanceCertificationData({
            jobName: "Galaxy Tower",
            pflowSerialNumber: "M-1000",
            modelNumber: "21",
            customerContactName: "Taylor Client",
            loadTest: { yes: true, percent: "80%" },
            operationTestYes: true,
            gateInterlock: "yes",
            customerInitials: "TC",
            acceptedByName: "Taylor Client",
            pflowRepName: "Jordan Tech",
            acceptanceNotes: "All tests completed successfully.",
          }),
        },
      ],
      photos: [],
    };

    const html = buildReportHtml(report);
    expect(html).toContain(`<div class="section-title">${ACCEPTANCE_CERT_DOC_NAME}</div>`);
    expect(html).toContain("Taylor Client");
    expect(html).toContain("80%");
    expect(html).toContain("Jordan Tech");
    expect(html).toContain("All tests completed successfully.");
  });

  it("omits the acceptance certification section when empty", () => {
    const report = {
      ...baseReportInfo,
      tripType: "Start Up",
      documents: [
        {
          id: "fsr",
          name: "Field Service Report",
          done: false,
          data: ensureFsrDocData({ entries: [] }),
        },
        {
          id: "acceptance-empty",
          name: ACCEPTANCE_CERT_DOC_NAME,
          done: false,
          data: makeEmptyAcceptanceCertificationData(),
        },
      ],
      photos: [],
    };

    const html = buildReportHtml(report);
    expect(html).not.toContain(`<div class="section-title">${ACCEPTANCE_CERT_DOC_NAME}</div>`);
  });

  it("supports legacy acceptance certification document names", () => {
    const legacyName = ACCEPTANCE_CERT_LEGACY_NAMES[0] || "Acceptance Certification (15710-0017)";
    const report = {
      ...baseReportInfo,
      tripType: "Start Up",
      sharedSite: {
        jobName: "Legacy Tower",
        serialNumberText: "M-2000",
        siteStreetAddress: "200 State St",
        siteCity: "Milwaukee",
        siteState: "WI",
        siteZip: "53202",
      },
      documents: [
        {
          id: "acceptance-legacy",
          name: legacyName,
          done: false,
          data: ensureAcceptanceCertificationData({
            jobName: "Legacy Tower",
            customerContactName: "Alex Legacy",
            acceptedByName: "Alex Legacy",
            operationTestYes: true,
          }),
        },
      ],
      photos: [],
    };

    const html = buildReportHtml(report);
    expect(html).toContain(`<div class="section-title">${ACCEPTANCE_CERT_DOC_NAME}</div>`);
    expect(html).toContain("Legacy Tower");
    expect(html).toContain("Alex Legacy");
  });
});

describe("makeDocs", () => {
  it("includes acceptance certification and motor test in Start Up defaults", () => {
    const docs = makeDocs("Start Up");
    expect(docs.map((doc) => doc.name)).toEqual([
      "Field Service Report",
      "Startup Checklist",
      ACCEPTANCE_CERT_DOC_NAME,
      MOTOR_TEST_DOC_NAME,
      "Service Summary",
    ]);
  });
});

describe("loadReports", () => {
  const createStorage = (reportsPayload) => {
    const store = new Map();
    if (reportsPayload !== undefined) {
      store.set("fsr.reports", JSON.stringify(reportsPayload));
    }
    return {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
    };
  };

  it("normalizes legacy document names", () => {
    const acceptanceLegacy = ACCEPTANCE_CERT_LEGACY_NAMES[0] || "Acceptance Certification (15710-0017)";
    const motorLegacy = MOTOR_TEST_LEGACY_NAMES[0] || "Motor Test Data Sheet – Frequency Drive";

    const storage = createStorage([
      {
        id: "r1",
        documents: [
          { id: "d1", name: acceptanceLegacy, done: false, data: { acceptedByName: "Alex" } },
          { id: "d2", name: motorLegacy, done: false, data: { testedByName: "Morgan" } },
        ],
      },
    ]);

    const reports = loadReports(storage);
    expect(Array.isArray(reports)).toBe(true);
    const names = reports[0].documents.map((doc) => doc.name);
    expect(names).toContain(ACCEPTANCE_CERT_DOC_NAME);
    expect(names).toContain(MOTOR_TEST_DOC_NAME);
  });

  it("removes per-document model checkbox data and sets the schema flag", () => {
    const storage = createStorage([
      {
        id: "r1",
        model: "F",
        documents: [
          {
            id: "service",
            name: "Service Summary",
            data: { reasonForVisit: "Fix motor", modelChecks: { B: true }, modelOther: "custom" },
          },
          {
            id: "acceptance",
            name: ACCEPTANCE_CERT_DOC_NAME,
            data: { modelChecks: { B: true }, modelOther: "extra", acceptedByName: "Alex" },
          },
          {
            id: "motor",
            name: MOTOR_TEST_DOC_NAME,
            data: { modelChecks: { B: true }, modelOther: "extra", testedByName: "Morgan" },
          },
        ],
      },
    ]);

    const reports = loadReports(storage);
    const [report] = reports;
    expect(storage.getItem("fsr.schema.modelUnified")).toBe("true");

    report.documents.forEach((doc) => {
      expect(doc.data).not.toHaveProperty("modelChecks");
      expect(doc.data).not.toHaveProperty("modelOther");
    });

    const persisted = JSON.parse(storage.getItem("fsr.reports"));
    persisted[0].documents.forEach((doc) => {
      expect(doc.data).not.toHaveProperty("modelChecks");
      expect(doc.data).not.toHaveProperty("modelOther");
    });

    const repeatLoad = loadReports(storage);
    repeatLoad[0].documents.forEach((doc) => {
      expect(doc.data).not.toHaveProperty("modelChecks");
      expect(doc.data).not.toHaveProperty("modelOther");
    });
  });

  it("prunes meta keys from acceptance and motor docs and sets the flag (idempotent)", () => {
    const storage = createStorage([
      {
        id: "r1",
        model: "F",
        sharedSite: {
          jobName: "Shared Job",
          serialNumberText: "SH-001",
          siteStreetAddress: "1 Shared St",
          siteMailingAddress: "PO Shared",
          siteCity: "Shared City",
          siteState: "WI",
          siteZip: "53202",
        },
        documents: [
          {
            id: "acceptance",
            name: ACCEPTANCE_CERT_DOC_NAME,
            data: {
              jobName: "Local Job",
              pflowSerialNumber: "LOC-123",
              serialNumberText: "legacy",
              modelNumber: "M",
              modelChecks: { B: true },
              modelOther: "x",
              siteStreetAddress: "100 Main",
              siteMailingAddress: "PO 100",
              siteCity: "Milwaukee",
              siteState: "WI",
              siteZip: "53202",
              acceptedByName: "Alex",
            },
          },
          {
            id: "motor",
            name: MOTOR_TEST_DOC_NAME,
            data: {
              jobName: "Local Job",
              pflowSerialNumber: "M-123",
              serialNumberText: "legacy",
              modelNumber: "F",
              modelChecks: { F: true },
              modelOther: "y",
              siteStreetAddress: "200 Oak",
              siteCity: "Chicago",
              siteState: "IL",
              siteZip: "60601",
              testedByName: "Morgan",
            },
          },
        ],
      },
    ]);

    const reports = loadReports(storage);
    const [report] = reports;
    expect(storage.getItem("fsr.schema.metaPruned")).toBe("true");

    report.documents.forEach((doc) => {
      if ([ACCEPTANCE_CERT_DOC_NAME, MOTOR_TEST_DOC_NAME].includes(doc.name)) {
        // keys should be pruned
        [
          "jobName",
          "serialNumberText",
          "pflowSerialNumber",
          "modelNumber",
          "modelChecks",
          "modelOther",
          "siteStreetAddress",
          "siteMailingAddress",
          "siteCity",
          "siteState",
          "siteZip",
        ].forEach((k) => expect(doc.data).not.toHaveProperty(k));
      }
    });

    const persisted = JSON.parse(storage.getItem("fsr.reports"));
    persisted[0].documents.forEach((doc) => {
      if ([ACCEPTANCE_CERT_DOC_NAME, MOTOR_TEST_DOC_NAME].includes(doc.name)) {
        [
          "jobName",
          "serialNumberText",
          "pflowSerialNumber",
          "modelNumber",
          "modelChecks",
          "modelOther",
          "siteStreetAddress",
          "siteMailingAddress",
          "siteCity",
          "siteState",
          "siteZip",
        ].forEach((k) => expect(doc.data).not.toHaveProperty(k));
      }
    });

    const repeatLoad = loadReports(storage);
    repeatLoad[0].documents.forEach((doc) => {
      if ([ACCEPTANCE_CERT_DOC_NAME, MOTOR_TEST_DOC_NAME].includes(doc.name)) {
        [
          "jobName",
          "serialNumberText",
          "pflowSerialNumber",
          "modelNumber",
          "modelChecks",
          "modelOther",
          "siteStreetAddress",
          "siteMailingAddress",
          "siteCity",
          "siteState",
          "siteZip",
        ].forEach((k) => expect(doc.data).not.toHaveProperty(k));
      }
    });
  });

  it("prunes removed Service Summary keys and sets the flag (idempotent)", () => {
    const storage = createStorage([
      {
        id: "r1",
        model: "F",
        documents: [
          {
            id: "service",
            name: "Service Summary",
            data: {
              reasonForVisit: "Old reason",
              servicePerformed: "Did work",
              partsReplaced: "Old parts",
              pflowServiceTechnician: "Name",
            },
          },
        ],
      },
    ]);

    const reports = loadReports(storage);
    const [report] = reports;
    expect(storage.getItem("fsr.schema.serviceSummary.prunedV1")).toBe("true");

    const serviceDoc = report.documents.find((d) => d.name === "Service Summary");
    expect(serviceDoc).toBeTruthy();
    ["reasonForVisit", "partsReplaced", "pflowServiceTechnician"].forEach((k) => {
      expect(serviceDoc.data).not.toHaveProperty(k);
    });
    expect(serviceDoc.data.servicePerformed).toBe("Did work");

    const persisted = JSON.parse(storage.getItem("fsr.reports"));
    const pServiceDoc = persisted[0].documents.find((d) => d.name === "Service Summary");
    ["reasonForVisit", "partsReplaced", "pflowServiceTechnician"].forEach((k) => {
      expect(pServiceDoc.data).not.toHaveProperty(k);
    });

    const repeat = loadReports(storage);
    const rServiceDoc = repeat[0].documents.find((d) => d.name === "Service Summary");
    ["reasonForVisit", "partsReplaced", "pflowServiceTechnician"].forEach((k) => {
      expect(rServiceDoc.data).not.toHaveProperty(k);
    });
  });
});
