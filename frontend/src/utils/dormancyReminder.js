// Dormancy reminder: an Active / Reactivated account whose records have not been updated
// for 2 years (counted from Date Opened, or a later Date Updated / reactivation date)
// is due for an update before it becomes dormant.

export const DORMANCY_REMINDER_YEARS = 2;

/** Only branch staff get the reminder (not admin, compliance or audit). */
export const DORMANCY_REMINDER_ROLES = ["cashier", "manager", "user"];
export const showsDormancyReminder = (primaryRole) => DORMANCY_REMINDER_ROLES.includes(primaryRole);

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(String(v).substring(0, 10) + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
};

const addYears = (d, n) => {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
};

/** Whole years and months between two dates, e.g. "2 years and 3 months". */
const elapsedText = (from, to) => {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} year${y !== 1 ? "s" : ""}`);
  if (m) parts.push(`${m} month${m !== 1 ? "s" : ""}`);
  return parts.join(" and ") || "less than a month";
};

/**
 * @param account  { account_no, status, date_opened, date_updated, status_date }
 * @returns null when no reminder is needed, otherwise details for the reminder.
 */
export const dormancyReminderFor = (account, today = new Date()) => {
  if (!account || !["active", "reactivated"].includes(account.status)) return null;

  const opened  = toDate(account.date_opened);
  const updated = toDate(account.date_updated);
  const reactivated = account.status === "reactivated" ? toDate(account.status_date) : null;
  const candidates = [
    opened      && { date: opened,      label: "Date Opened" },
    updated     && { date: updated,     label: "Date Updated" },
    reactivated && { date: reactivated, label: "Date of Reactivation" },
  ].filter(Boolean);
  if (!candidates.length) return null;

  // Count from the most recent of the dates above.
  const basis = candidates.reduce((a, b) => (b.date > a.date ? b : a));
  const dueDate = addYears(basis.date, DORMANCY_REMINDER_YEARS);
  if (today < dueDate) return null;

  return {
    accountNo: account.account_no ?? null,
    basisLabel: basis.label,
    basisDate: basis.date,
    dueDate,
    elapsed: elapsedText(basis.date, today),
  };
};

const isoDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Reminders for every account of a customer (main account + extra accounts).
 * A reminder that staff already saw (customer.dormancy_acknowledgments) is left out:
 * it only comes back after a new 2-year period.
 */
export const dormancyRemindersForCustomer = (customer, today = new Date()) => {
  if (!customer) return [];
  const seen = new Set(
    (customer.dormancy_acknowledgments ?? []).map((a) => `${a.customer_account_id ?? "main"}|${String(a.basis_date).substring(0, 10)}`)
  );
  const accounts = [
    { idx: 1, id: null, account_no: customer.account_no, status: customer.status, date_opened: customer.date_opened, date_updated: customer.date_updated, status_date: customer.status_date },
    ...(customer.accounts ?? []).map((a, i) => ({ ...a, idx: i + 2 })),
  ];
  return accounts
    .map((a) => {
      const r = dormancyReminderFor(a, today);
      if (!r || seen.has(`${a.id ?? "main"}|${isoDay(r.basisDate)}`)) return null;
      return { ...r, acctIndex: a.idx, customerAccountId: a.id ?? null };
    })
    .filter(Boolean);
};
