// Copy trip contact details once so the certificate can name a different contact.
export function prefillAcceptanceContact(data, report) {
  if (data.contactPrefillComplete) return data;
  const project = report?.inviteMeta?.projectContact || {};
  const install = report?.inviteMeta?.installContact || {};
  const siteContact = report?.sharedSite?.customerContact || "";
  const [siteName, sitePhone] = siteContact.split(/\s+\|\s+/, 2);
  const defaults = {
    customerContactName: project.name || install.name || siteName || "",
    customerContactPhone: project.phone || install.phone || sitePhone || "",
    customerContactEmail: project.email || install.email || "",
    customerCompany: project.company || install.company || "",
  };
  if (!Object.values(defaults).some(Boolean)) return data;
  return {
    ...data,
    ...Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, data[key] || value])),
    contactPrefillComplete: true,
  };
}
