// Shared wording for joint account types and who is who on a joint account.
//
//   Regular joint (joint_sub_type "Non-ITF"): AND / OR — Primary + Secondary Account Holders
//   ITF (joint_sub_type "ITF"): Sole / Joint Trustee — Trustee(s) + In-Trust-For person(s)
//   For the Account Of (joint_sub_type "FAO"): AND / OR — Primary + Secondary, plus Account Name + Organization

// What staff see for each stored value (stored values stay AND / OR).
export const JOINT_ARRANGEMENT_LABELS = {
  AND: "All Must Sign",
  OR: "Any May Sign",
  "Sole Trustee": "Sole Trustee",
  "Joint Trustee": "Joint Trustee",
};

export const jointArrangementLabel = (value) => JOINT_ARRANGEMENT_LABELS[value] ?? value;

export const JOINT_ARRANGEMENTS_BY_SUB_TYPE = {
  "Non-ITF": [
    { value: "AND", label: JOINT_ARRANGEMENT_LABELS.AND },
    { value: "OR",  label: JOINT_ARRANGEMENT_LABELS.OR },
  ],
  FAO: [
    { value: "AND", label: JOINT_ARRANGEMENT_LABELS.AND },
    { value: "OR",  label: JOINT_ARRANGEMENT_LABELS.OR },
  ],
  ITF: [
    { value: "Sole Trustee",  label: "Sole Trustee" },
    { value: "Joint Trustee", label: "Joint Trustee" },
  ],
};

export const JOINT_SUB_TYPE_LABELS = {
  "Non-ITF": "Regular Joint",
  ITF: "ITF",
  FAO: "For the Account Of",
};

export const isFaoCustomer = (customer) =>
  customer?.account_type === "Joint" && customer?.joint_sub_type === "FAO";

/** Regular joint and "For the Account Of" both use AND / OR with per-account documents. */
export const isAndOrJointCustomer = (customer) =>
  customer?.account_type === "Joint" && (customer?.joint_sub_type === "Non-ITF" || customer?.joint_sub_type === "FAO");

export const isItfCustomer = (customer) =>
  customer?.account_type === "Joint" && customer?.joint_sub_type === "ITF";

/** e.g. "Regular Joint — All Must Sign", "For the Account Of — Any May Sign", "ITF — Not set". */
export const jointTypeLabel = (customer) => {
  if (customer?.account_type !== "Joint") return "—";
  const kind = JOINT_SUB_TYPE_LABELS[customer.joint_sub_type] ?? "Joint";
  return `${kind} — ${customer.joint_arrangement ? jointArrangementLabel(customer.joint_arrangement) : "Not set"}`;
};

/**
 * Role label for a person on a joint account.
 * @param customer    the customer record
 * @param personIndex 1 for the main holder, 2+ for co-holders
 * @param holder      the customer_holders row (for Person 2+)
 */
export const jointPersonRole = (customer, personIndex, holder = null) => {
  if (isItfCustomer(customer)) {
    if (personIndex === 1) return "Trustee";
    return holder?.role === "trustee" ? "Trustee" : "In-Trust-For";
  }
  return personIndex === 1 ? "Primary Account Holder" : "Secondary Account Holder";
};
