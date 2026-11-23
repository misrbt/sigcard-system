// Shared rules for how joint and business accounts are set up (who is who, signing rules).
// Used by the customer profile, Edit Docs and the status-change upload box,
// together with components/customer/AccountStructure.jsx.
import { isItfCustomer, jointPersonRole } from "./jointAccount";

export const SIGNING_RULE_TEXT = {
  AND:             { title: "All Must Sign", text: "Every account holder listed below must sign together." },
  OR:              { title: "Any May Sign",  text: "Any one of the account holders listed below may sign alone." },
  "Sole Trustee":  { title: "Sole Trustee",  text: "One trustee signs and manages the account for the In-Trust-For person(s)." },
  "Joint Trustee": { title: "Joint Trustee", text: "Two or more trustees manage the account for the In-Trust-For person(s)." },
};

export const riskPillStyle = {
  "Low Risk":    "bg-emerald-50 text-emerald-700",
  "Medium Risk": "bg-yellow-50 text-yellow-700",
  "High Risk":   "bg-red-50 text-red-700",
};

export const holderFullName = (h) =>
  h ? `${h.firstname ?? ""}${h.middlename ? " " + h.middlename : ""} ${h.lastname ?? ""}${h.suffix ? " " + h.suffix : ""}`.trim() : "";

/**
 * Everyone on a joint or business account, in order, with the role staff should see.
 * Person 1 is the customer record itself; Person 2+ come from customer.holders.
 */
export const accountPeople = (customer) => {
  if (!customer) return [];
  const isCorporate = customer.account_type === "Corporate";
  const isSole = isCorporate && customer.corporate_sub_type === "Sole Proprietorship";
  const primary = {
    person_index: 1, firstname: customer.firstname, middlename: customer.middlename, lastname: customer.lastname,
    suffix: customer.suffix, risk_level: customer.risk_level,
  };
  const others = isSole ? [] : (customer.holders ?? []);
  return [primary, ...others].map((h) => ({
    ...h,
    name: holderFullName(h),
    role: isCorporate
      ? (isSole ? "Sole Proprietor" : h.person_index === 1 ? "Primary Signatory" : `Signatory ${h.person_index}`)
      : jointPersonRole(customer, h.person_index, h),
  }));
};

/** Colour for a person's card: blue for person 1, purple for joint co-holders, slate for signatories. */
export const personTone = (customer, personIndex) => {
  if (customer?.account_type === "Corporate") {
    if (customer.corporate_sub_type === "Sole Proprietorship") return "amber";
    return personIndex === 1 ? "blue" : "slate";
  }
  return personIndex === 1 ? "blue" : "purple";
};

/** ITF people split into Trustees / In-Trust-For; everyone else is one group. */
export const groupPeople = (customer, people) => {
  if (!isItfCustomer(customer)) return [{ title: null, people }];
  return [
    { title: "Trustees", people: people.filter((p) => p.role === "Trustee") },
    { title: "In-Trust-For", people: people.filter((p) => p.role !== "Trustee") },
  ].filter((g) => g.people.length);
};

/** Grid for one card (centered) or several (side by side). */
export const cardGridCls = (count) =>
  count > 1 ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "w-full max-w-md mx-auto";
