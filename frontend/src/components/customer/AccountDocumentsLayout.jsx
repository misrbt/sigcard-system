// Joint and business account document layouts:
//   banner  →  1 Signature Card  →  2 People (their own Risk Profiling)  →  3 Account Documents
// Shared by the customer profile, the Branch Documents page and the Customer Profiles quick view.
import { HiOutlineEye, HiOutlinePhotograph } from "react-icons/hi";
import { MdFingerprint } from "react-icons/md";
import { CompanyBanner, CompanyCard, PersonCard, SigningRuleBanner, StepHeading } from "./AccountStructure";
import { groupPeople, personTone } from "../../utils/accountStructure";
import { PERSON_DOC_LABELS, buildCorporateGroups, buildJointGroups, storageUrl } from "../../utils/accountDocuments";

// ── Joint account layout ──────────────────────────────────────────────────────
// Arranges a joint account's documents the way the account is structured:
//   1. Signing rule      2. Signature cards (shared by everyone)
//   3. One card per person with that person's own documents (Risk Profiling)
//   4. Documents for the whole account (NAIS, Data Privacy)
// ITF accounts keep everything shared, with people grouped as Trustees / In-Trust-For.
// Every document lands in exactly one place, so old records (e.g. NAIS filed per person) still show.

export const DocThumb = ({ doc, alt, onOpen, aspect = "aspect-[3/4]" }) => (
  doc ? (
    <div>
      <button
        type="button"
        onClick={() => onOpen(doc.file_path)}
        className={`relative group w-full ${aspect} rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm`}
      >
        <img src={storageUrl(doc.file_path)} alt={alt} className={`w-full h-full object-contain transition-all`} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 rounded-full p-1.5 shadow">
            <HiOutlineEye className="w-4 h-4 text-slate-700" />
          </div>
        </div>
      </button>
      {doc.document_type === "sigcard_front" && doc.has_thumbmark === false && (
        <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 w-fit">
          <MdFingerprint className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <span className="text-[10px] font-medium text-amber-600 whitespace-nowrap">No thumbmark</span>
        </div>
      )}
    </div>
  ) : (
    <div className={`w-full ${aspect} rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1`}>
      <HiOutlinePhotograph className="w-5 h-5 text-slate-300" />
      <span className="text-[10px] text-slate-400">Not uploaded</span>
    </div>
  )
);

export const SignatureCardsSection = ({ n, cards, badge = "Shared by all holders", onOpen }) => (
  <div>
    <StepHeading n={n} title="Signature Card" badge={badge} note={cards.length > 1 ? `${cards.length} cards` : null} />
    <div className={cards.length > 1 ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "w-full max-w-md mx-auto"}>
      {(cards.length ? cards : [null]).map((d, i) => (
        <div key={d?.id ?? i}>
          {cards.length > 1 && (
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Signature Card {i + 1}</p>
          )}
          <DocThumb doc={d} alt={`Signature Card ${i + 1}`} onOpen={onOpen} aspect="aspect-[4/3]" />
        </div>
      ))}
    </div>
  </div>
);

export const AccountDocsSection = ({ n, sections, badge = "Shared by all holders", onOpen }) => (
  <div>
    <StepHeading n={n} title="Account Documents" badge={badge} />
    <div className="space-y-5">
      {sections.map((s) => {
        const count = Math.max(s.fronts.length, s.backs.length);
        return (
          <div key={s.key}>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{s.label}</p>
            {count === 0 ? (
              <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <HiOutlinePhotograph className="w-4 h-4 text-slate-300" />
                <p className="text-sm text-slate-400">No documents uploaded</p>
              </div>
            ) : !s.back ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {s.fronts.map((d, i) => (
                  <div key={d.id}>
                    {s.fronts.length > 1 && <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">{i + 1}</p>}
                    <DocThumb doc={d} alt={`${s.label} ${i + 1}`} onOpen={onOpen} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: count }, (_, i) => (
                  <div key={i}>
                    {count > 1 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Set {i + 1}</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[{ doc: s.fronts[i], lbl: "Front" }, { doc: s.backs[i], lbl: "Back" }].map(({ doc, lbl }) => (
                        <div key={lbl}>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">{lbl}</p>
                          <DocThumb doc={doc ?? null} alt={`${s.label} ${lbl}`} onOpen={onOpen} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export const RiskProfilingThumbs = ({ docs, name, onOpen }) => (
  <>
    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
      Risk Profiling{docs.length > 1 ? ` (${docs.length})` : ""}
    </p>
    <div className={`grid gap-2 ${docs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {(docs.length ? docs : [null]).map((d, i) => (
        <DocThumb key={d?.id ?? i} doc={d} alt={`Risk Profiling — ${name}`} onOpen={onOpen} />
      ))}
    </div>
  </>
);

export const JointDocumentsLayout = ({ customer, docs, onOpen }) => {
  const g = buildJointGroups(customer, docs);
  let step = 0;
  return (
    <div className="space-y-7">
      <SigningRuleBanner customer={customer} />

      <SignatureCardsSection n={++step} cards={g.signatureCards} onOpen={onOpen} />

      {/* People on the account */}
      <div>
        <StepHeading n={++step} title="Account Holders"
          note={g.isItf ? `${g.persons.length} people · documents for this account are shared (see below)` : `${g.persons.length} people · each person's own Risk Profiling`} />
        <div className="space-y-4">
          {groupPeople(customer, g.persons).map((grp) => (
            <div key={grp.title ?? "all"}>
              {grp.title && <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{grp.title} ({grp.people.length})</p>}
              <div className={`grid gap-4 ${g.isItf ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                {grp.people.map((p) => {
                  const extra = p.docs.filter((d) => d.document_type !== "sigcard_back");
                  return (
                    <PersonCard key={p.person_index} number={p.person_index} name={p.name || `Person ${p.person_index}`}
                      role={p.role} risk={p.risk_level} tone={personTone(customer, p.person_index)}>
                      {!g.isItf && (
                        <>
                          <RiskProfilingThumbs docs={p.docs.filter((d) => d.document_type === "sigcard_back")} name={p.name} onOpen={onOpen} />
                          {extra.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Other files for this person</p>
                              <div className="grid grid-cols-2 gap-2">
                                {extra.map((d) => (
                                  <div key={d.id}>
                                    <p className="text-[10px] text-slate-500 mb-1">{PERSON_DOC_LABELS[d.document_type]}</p>
                                    <DocThumb doc={d} alt={PERSON_DOC_LABELS[d.document_type]} onOpen={onOpen} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </PersonCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AccountDocsSection n={++step} sections={g.sharedSections} onOpen={onOpen} />
    </div>
  );
};

// ── Corporate account layout ──────────────────────────────────────────────────
// Corporate:            company signature card(s), one Risk Profiling per signatory plus one for the
//                       company itself (filed under the person number after the last signatory),
//                       then NAIS / Data Privacy for the account.
// Sole Proprietorship:  one signature card, the proprietor's Risk Profiling, then NAIS / Data Privacy.
// `docs` = documents for the whole customer; `acctDocs` = documents for the account tab being viewed.

export const CorporateDocumentsLayout = ({ customer, docs, acctDocs, onOpen }) => {
  const g = buildCorporateGroups(customer, docs, acctDocs);
  let step = 0;
  return (
    <div className="space-y-7">
      <CompanyBanner customer={customer} />

      <SignatureCardsSection n={++step} cards={g.signatureCards} badge={g.isSole ? null : "Company signature card"} onOpen={onOpen} />

      <div>
        <StepHeading n={++step} title={g.isSole ? "Proprietor" : "Authorized Signatories"}
          note={g.isSole ? "the owner's Risk Profiling" : `${g.persons.length} signatories · each signatory's own Risk Profiling, plus the company's`} />
        <div className={g.isSole ? "w-full max-w-sm mx-auto" : "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}>
          {g.persons.map((p) => (
            <PersonCard key={p.person_index} number={p.person_index} name={p.name || `Signatory ${p.person_index}`} role={p.role}
              tone={personTone(customer, p.person_index)}>
              <RiskProfilingThumbs docs={p.docs} name={p.name} onOpen={onOpen} />
            </PersonCard>
          ))}
          {!g.isSole && (
            <CompanyCard customer={customer}>
              <RiskProfilingThumbs docs={g.companyBacks} name={customer.company_name} onOpen={onOpen} />
            </CompanyCard>
          )}
        </div>
        {g.isSole && g.companyBacks.length > 0 && (
          <div className="mt-4 w-full max-w-sm mx-auto">
            <PersonCard number="?" name="Not matched to the proprietor" role="Older upload" tone="slate">
              <RiskProfilingThumbs docs={g.companyBacks} name="" onOpen={onOpen} />
            </PersonCard>
          </div>
        )}
      </div>

      <AccountDocsSection n={++step} sections={g.sharedSections} badge={null} onOpen={onOpen} />
    </div>
  );
};
