// How a joint or business account's documents are grouped for viewing:
// who the signature cards, Risk Profilings, NAIS and Data Privacy forms belong to.
// Used by the customer profile, the Branch Documents page and the Customer Profiles quick view.
import { isItfCustomer } from "./jointAccount";
import { accountPeople } from "./accountStructure";

export const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

/**
 * The documents currently on file (same choice the customer profile makes):
 * the newest status-change upload, else the newest older status group, else the first upload.
 * Replaced (archived) documents are left out.
 */
export const currentDocuments = (customer) => {
  const all = customer?.documents ?? [];
  const latestLog = (customer?.status_logs ?? []).find((log) => (log.documents ?? []).length > 0);
  if (latestLog) return latestLog.documents.filter((d) => d.is_current !== false);
  const legacy = all.filter((d) => d.account_status && !d.status_log_id);
  if (legacy.length) {
    const newest = legacy.reduce((a, b) => ((b.created_at ?? "") > (a.created_at ?? "") ? b : a));
    return legacy.filter((d) => d.account_status === newest.account_status && d.is_current !== false);
  }
  return all.filter((d) => !d.account_status && d.is_current !== false);
};

export const PERSON_DOC_LABELS = {
  sigcard_back: "Risk Profiling",
  nais_front: "NAIS — Front", nais_back: "NAIS — Back",
  privacy_front: "Data Privacy — Front", privacy_back: "Data Privacy — Back",
};

export const buildJointGroups = (customer, docs) => {
  const isItf = isItfCustomer(customer);
  const people = accountPeople(customer);
  const known = new Set(people.map((p) => p.person_index));
  const byId = (a, b) => (a.person_index - b.person_index) || (a.id - b.id);

  const signatureCards = docs.filter((d) => d.document_type === "sigcard_front").sort(byId);

  // A document belongs to a person when it is per-person and filed under a real holder other than
  // the account itself (person 1 also gets their own Risk Profiling).
  const isPersonDoc = (d) => {
    if (isItf || !known.has(d.person_index)) return false;
    if (d.document_type === "sigcard_back") return true;
    return d.person_index > 1 && !!PERSON_DOC_LABELS[d.document_type];
  };

  const persons = people.map((p) => ({
    ...p,
    docs: docs.filter((d) => d.person_index === p.person_index && isPersonDoc(d)).sort(byId),
  }));

  const sharedSections = [
    ...(isItf ? [{ key: "sigcard_back", label: "Risk Profiling", front: "sigcard_back", back: null }] : []),
    { key: "nais",    label: "NAIS",         front: "nais_front",    back: "nais_back" },
    { key: "privacy", label: "Data Privacy", front: "privacy_front", back: "privacy_back" },
  ].map((s) => {
    const pick = (type) => type ? docs.filter((d) => d.document_type === type && !isPersonDoc(d)).sort(byId) : [];
    return { ...s, fronts: pick(s.front), backs: pick(s.back) };
  });
  // Non-ITF: a Risk Profiling filed under a person who no longer exists still has to show somewhere.
  if (!isItf) {
    const strayBacks = docs.filter((d) => d.document_type === "sigcard_back" && !isPersonDoc(d)).sort(byId);
    if (strayBacks.length) sharedSections.unshift({ key: "sigcard_back", label: "Risk Profiling (not matched to a holder)", fronts: strayBacks, backs: [], back: null });
  }

  const otherDocs = docs.filter((d) => d.document_type === "other");
  return { isItf, people, signatureCards, persons, sharedSections, otherDocs };
};

/** Image list for the full-size viewer, in the same order the joint layout shows them. */
export const jointViewerImages = (customer, docs) => {
  const g = buildJointGroups(customer, docs);
  const imgs = [];
  g.signatureCards.forEach((d, i) => imgs.push({ src: storageUrl(d.file_path), label: g.signatureCards.length > 1 ? `Signature Card ${i + 1} (Shared)` : "Signature Card (Shared)", person: null }));
  g.persons.forEach((p) => p.docs.forEach((d) => imgs.push({ src: storageUrl(d.file_path), label: `${PERSON_DOC_LABELS[d.document_type] ?? d.document_type} — ${p.name}`, person: p.person_index })));
  imgs.push(...sharedSectionImages(g.sharedSections));
  g.otherDocs.forEach((d) => imgs.push({ src: storageUrl(d.file_path), label: "Other Document", person: null }));
  return imgs;
};

/** Viewer list for "Account Documents" sections (front/back sets, or single images). */
export const sharedSectionImages = (sections) => {
  const imgs = [];
  sections.forEach((s) => {
    const n = Math.max(s.fronts.length, s.backs.length);
    for (let i = 0; i < n; i++) {
      const set = n > 1 ? ` ${i + 1}` : "";
      if (s.fronts[i]) imgs.push({ src: storageUrl(s.fronts[i].file_path), label: s.back ? `${s.label}${set} — Front` : `${s.label}${set}`, person: null });
      if (s.backs[i])  imgs.push({ src: storageUrl(s.backs[i].file_path),  label: `${s.label}${set} — Back`, person: null });
    }
  });
  return imgs;
};

export const buildCorporateGroups = (customer, docs, acctDocs) => {
  const isSole = customer.corporate_sub_type === "Sole Proprietorship";
  const people = accountPeople(customer);
  const known = new Set(people.map((p) => p.person_index));
  const byId = (a, b) => (a.person_index - b.person_index) || (a.id - b.id);

  const signatureCards = docs.filter((d) => d.document_type === "sigcard_front").sort(byId);
  const backs = docs.filter((d) => d.document_type === "sigcard_back").sort(byId);
  const persons = people.map((p) => ({ ...p, docs: backs.filter((d) => d.person_index === p.person_index) }));
  // Corporate: the Risk Profiling after the last signatory belongs to the company itself.
  const companyBacks = backs.filter((d) => !known.has(d.person_index));

  const sharedSections = [
    { key: "nais",    label: "NAIS",         front: "nais_front",    back: "nais_back" },
    { key: "privacy", label: "Data Privacy", front: "privacy_front", back: "privacy_back" },
  ].map((s) => ({
    ...s,
    fronts: acctDocs.filter((d) => d.document_type === s.front).sort(byId),
    backs:  acctDocs.filter((d) => d.document_type === s.back).sort(byId),
  }));
  const otherDocs = acctDocs.filter((d) => d.document_type === "other");
  return { isSole, signatureCards, persons, companyBacks, sharedSections, otherDocs };
};

export const corporateViewerImages = (customer, docs, acctDocs) => {
  const g = buildCorporateGroups(customer, docs, acctDocs);
  const company = customer.company_name || "Company";
  const imgs = [];
  g.signatureCards.forEach((d, i) => imgs.push({ src: storageUrl(d.file_path), label: g.signatureCards.length > 1 ? `Signature Card ${i + 1}` : "Signature Card", person: null }));
  g.persons.forEach((p) => p.docs.forEach((d) => imgs.push({ src: storageUrl(d.file_path), label: `Risk Profiling — ${p.name}`, person: p.person_index })));
  g.companyBacks.forEach((d) => imgs.push({ src: storageUrl(d.file_path), label: `Risk Profiling — ${company}`, person: null }));
  imgs.push(...sharedSectionImages(g.sharedSections));
  g.otherDocs.forEach((d) => imgs.push({ src: storageUrl(d.file_path), label: "Other Document", person: null }));
  return imgs;
};

