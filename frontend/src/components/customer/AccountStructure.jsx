// Shared pieces that explain how a joint or business account is set up.
// Used by the customer profile (viewing), Edit Docs, and the status-change upload box,
// so staff see the same structure everywhere:
//   banner (signing rule / company)  →  1 Signature Card  →  2 People  →  3 Account Documents
import { HiOutlineOfficeBuilding, HiOutlineUser, HiOutlineUsers } from "react-icons/hi";
import { isFaoCustomer, jointTypeLabel } from "../../utils/jointAccount";
import { SIGNING_RULE_TEXT, accountPeople, riskPillStyle } from "../../utils/accountStructure";

/** Numbered heading: "① Signature Card  [Shared by all holders]  note". */
export const StepHeading = ({ n, title, note, badge }) => (
  <div className="flex items-center gap-2 mb-3 flex-wrap">
    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{n}</span>
    <p className="text-sm font-bold text-slate-800">{title}</p>
    {badge && <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-full">{badge}</span>}
    {note && <span className="text-xs text-slate-400">{note}</span>}
  </div>
);

/** Joint account: type + signing rule in plain words (and Account Name / Organization for FAO). */
export const SigningRuleBanner = ({ customer }) => {
  const rule = SIGNING_RULE_TEXT[customer.joint_arrangement];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${rule ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-200"}`}>
      <HiOutlineUsers className={`w-5 h-5 mt-0.5 flex-shrink-0 ${rule ? "text-indigo-600" : "text-amber-600"}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{jointTypeLabel(customer).split(" — ")[0]} · Signing Rule</p>
        {rule ? (
          <p className="text-sm text-slate-800"><span className="font-bold">{rule.title}.</span> {rule.text}</p>
        ) : (
          <p className="text-sm text-amber-800"><span className="font-bold">Not set yet.</span> Open Edit Info to choose the signing rule for this account.</p>
        )}
        {isFaoCustomer(customer) && (customer.company_name || customer.organization) && (
          <p className="text-xs text-slate-500 mt-1">
            {customer.company_name && <>Account Name: <span className="font-semibold text-slate-700">{customer.company_name}</span></>}
            {customer.company_name && customer.organization && " · "}
            {customer.organization && <>Organization: <span className="font-semibold text-slate-700">{customer.organization}</span></>}
          </p>
        )}
      </div>
    </div>
  );
};

/** Business account: company name, who signs, company risk level. */
export const CompanyBanner = ({ customer }) => {
  const people = accountPeople(customer);
  const isSole = customer.corporate_sub_type === "Sole Proprietorship";
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${isSole ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
      {isSole
        ? <HiOutlineUser className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
        : <HiOutlineOfficeBuilding className="w-5 h-5 mt-0.5 flex-shrink-0 text-slate-600" />}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{isSole ? "Sole Proprietorship" : "Corporate Account"}</p>
        <p className="text-sm font-bold text-slate-900">{customer.company_name || "—"}</p>
        <p className="text-xs text-slate-600 mt-0.5">
          {isSole
            ? <>Owned and signed by <span className="font-semibold">{people[0]?.name || "—"}</span>, the sole proprietor.</>
            : <>{people.length} authorized signator{people.length === 1 ? "y" : "ies"} sign for this business.</>}
        </p>
      </div>
      {customer.risk_level && (
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${riskPillStyle[customer.risk_level] ?? "bg-slate-100 text-slate-600"}`}>
          {customer.risk_level}
        </span>
      )}
    </div>
  );
};

/** The right banner for the account type, or nothing for individual accounts. */
export const AccountStructureBanner = ({ customer }) => {
  if (customer?.account_type === "Joint") return <SigningRuleBanner customer={customer} />;
  if (customer?.account_type === "Corporate") return <CompanyBanner customer={customer} />;
  return null;
};

const PERSON_TONES = {
  blue:   { border: "border-blue-200",   head: "bg-blue-50",   dot: "bg-blue-600",   text: "text-blue-700" },
  purple: { border: "border-purple-200", head: "bg-purple-50", dot: "bg-purple-600", text: "text-purple-700" },
  slate:  { border: "border-slate-300",  head: "bg-slate-100", dot: "bg-slate-600",  text: "text-slate-700" },
  amber:  { border: "border-amber-200",  head: "bg-amber-50",  dot: "bg-amber-600",  text: "text-amber-700" },
  indigo: { border: "border-indigo-200", head: "bg-indigo-50", dot: "bg-indigo-700", text: "text-indigo-700" },
};

/** A person's card: coloured header (number, name, role, risk) with their own documents inside. */
export const PersonCard = ({ number, name, role, risk, tone = "slate", children }) => {
  const t = PERSON_TONES[tone] ?? PERSON_TONES.slate;
  return (
    <div className={`rounded-2xl border-2 overflow-hidden bg-white ${t.border}`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${t.head}`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${t.dot}`}>
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
          <p className={`text-xs font-semibold ${t.text}`}>{role}</p>
        </div>
        {risk && (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${riskPillStyle[risk] ?? "bg-slate-100 text-slate-600"}`}>
            {risk}
          </span>
        )}
      </div>
      {children && <div className="p-4">{children}</div>}
    </div>
  );
};

/** The company's own card on a Corporate account (its Risk Profiling sits after the last signatory). */
export const CompanyCard = ({ customer, children }) => (
  <PersonCard number={<HiOutlineOfficeBuilding className="w-4 h-4" />} name={customer.company_name || "Company"}
    role="The company itself" tone="indigo">
    {children}
  </PersonCard>
);
