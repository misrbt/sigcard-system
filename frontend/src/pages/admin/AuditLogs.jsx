import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdSearch, MdRefresh, MdExpandMore, MdExpandLess,
  MdFilterList, MdClose, MdHistory, MdSecurity,
  MdPerson, MdSettings, MdLogin, MdBadge, MdTimeline,
} from 'react-icons/md';
import {
  FaIdCard, FaUserShield, FaSignInAlt, FaSignOutAlt,
  FaUserPlus, FaUserEdit, FaUserTimes, FaKey, FaLock,
  FaUnlock, FaShieldAlt, FaDatabase, FaFileAlt,
  FaExclamationTriangle, FaCheckCircle, FaCog, FaArrowRight,
  FaPlus, FaTrash, FaEdit,
} from 'react-icons/fa';
import { HiOutlineX } from 'react-icons/hi';
import { adminService } from '../../services/adminService';
import api from '../../services/api';
import Pagination from '../../components/ui/Pagination';

const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',             label: 'All Activity',    icon: MdHistory   },
  { key: 'login',           label: 'Login Activity',  icon: MdLogin     },
  { key: 'customer',        label: 'Customer Records',icon: MdBadge     },
  { key: 'user_management', label: 'Staff Accounts',  icon: MdPerson    },
  { key: 'security',        label: 'Security',        icon: MdSecurity  },
  { key: 'system',          label: 'System',          icon: MdSettings  },
];

const DOC_TYPE_LABELS = {
  sigcard_front:  'Signature Card (Front)',
  sigcard_back:   'Signature Card (Back)',
  nais_front:     'NAIS Form (Front)',
  nais_back:      'NAIS Form (Back)',
  privacy_front:  'Data Privacy Consent (Front)',
  privacy_back:   'Data Privacy Consent (Back)',
  other:          'Supporting Document',
};

const STATUS_LABELS = {
  active:  'Active',
  dormant: 'Dormant',
  escheat: 'Escheated',
  closed:  'Closed',
};

const STATUS_COLORS = {
  active:  'bg-green-100 text-green-700',
  dormant: 'bg-yellow-100 text-yellow-700',
  escheat: 'bg-orange-100 text-orange-700',
  closed:  'bg-red-100 text-red-700',
};

const FIELD_LABELS = {
  status:        'Account Status',
  account_type:  'Account Type',
  risk_level:    'Risk Level',
  firstname:     'First Name',
  middlename:    'Middle Name',
  lastname:      'Last Name',
  suffix:        'Name Suffix',
  branch_id:     'Branch',
  document_type: 'Document Type',
  file_name:     'File Name',
  file_size:     'File Size',
  person_index:  'Account Holder',
  email:         'Email Address',
  username:      'Username',
  branch:        'Branch',
  name:          'Full Name',
};

// Hidden meta fields that add no value for non-technical readers
const META_EXCLUDE = new Set([
  'action', 'log_name', 'ip_address', 'user_agent',
]);

// Friendly meta field labels shown in the detail panel
const META_LABELS = {
  full_name:           'Customer Name',
  account_type:        'Account Type',
  risk_level:          'Risk Level',
  status:              'Account Status',
  branch_id:           'Branch',
  documents_uploaded:  'Documents Uploaded',
  document_type:       'Document Type',
  person_index:        'Account Holder',
  replaced_file:       'Previous File',
  diff:                'Changes Made',
  filters:             'Search Filters Used',
  ip:                  'From IP Address',
};

/** Convert bytes to a readable string */
const formatBytes = (bytes) => {
  const n = Number(bytes);
  if (isNaN(n)) return bytes;
  if (n < 1024)       return `${n} B`;
  if (n < 1048576)    return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
};

/** Ordinal suffix: 1 → 1st, 2 → 2nd */
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** Translate person_index numbers to human labels */
const personLabel = (index) => {
  const n = Number(index);
  if (n === 1) return 'Primary Account Holder';
  return `${ordinal(n)} Account Holder (Joint)`;
};

/** Plain-English description for an audit log entry */
const humanizeDescription = (description = '', properties = {}) => {
  const d   = description.toLowerCase();
  const who = properties.full_name ? ` for ${properties.full_name}` : '';
  const dt  = properties.document_type ? ` (${DOC_TYPE_LABELS[properties.document_type] ?? properties.document_type})` : '';

  if (d.includes('customer sigcard record created') || (d.includes('customer') && d.includes('creat')))
    return `A new customer signature card record was opened${who}.`;
  if (d.includes('customer sigcard record updated') || (d.includes('customer') && d.includes('updat')))
    return `Customer record details were updated${who}.`;
  if (d.includes('customer sigcard record deleted') || (d.includes('customer') && d.includes('delet')))
    return `Customer record was permanently removed${who}.`;
  if (d.includes('document replaced'))
    return `A document was replaced${who}${dt}.`;
  if (d.includes('login') && (d.includes('success') || d.includes('authenticated')))
    return 'User successfully signed in to the system.';
  if (d.includes('login') && d.includes('fail'))
    return 'A login attempt failed — incorrect username or password was entered.';
  if (d.includes('too many') || d.includes('login attempts'))
    return 'Account was locked because too many incorrect login attempts were made.';
  if (d.includes('logout') || d.includes('logged out'))
    return 'User signed out of the system.';
  if (d.includes('account locked') || d.includes('locked'))
    return 'User account was locked.';
  if (d.includes('unlock'))
    return 'User account was unlocked and restored to active access.';
  if (d.includes('password reset') || (d.includes('password') && d.includes('reset')))
    return 'User password was reset by an administrator.';
  if (d.includes('password changed') || (d.includes('password') && d.includes('changed')))
    return 'User changed their own password.';
  if (d.includes('2fa enabled') || (d.includes('two-factor') && d.includes('enabled')))
    return 'Two-step verification was turned on for this account.';
  if (d.includes('2fa disabled') || (d.includes('two-factor') && d.includes('disabled')))
    return 'Two-step verification was turned off for this account.';
  if (d.includes('user') && d.includes('creat'))
    return 'A new staff account was created.';
  if (d.includes('user') && d.includes('updat'))
    return 'A staff account profile was updated.';
  if (d.includes('user') && d.includes('delet'))
    return 'A staff account was deleted.';
  if (d.includes('user') && d.includes('activat'))
    return 'A staff account was activated.';
  if (d.includes('user') && d.includes('deactivat'))
    return 'A staff account was deactivated.';
  if (d.includes('role') && d.includes('assign'))
    return 'A user role (access level) was assigned to a staff account.';
  if (d.includes('role') && d.includes('remov'))
    return 'A user role (access level) was removed from a staff account.';
  if (d.includes('permission'))
    return 'Access permissions were changed.';
  if (d.includes('system settings') || (d.includes('settings') && d.includes('updat')))
    return 'System security settings were updated.';
  if (d.includes('branch hierarchy') || d.includes('branch parent'))
    return 'Branch data access hierarchy was updated.';
  if (d.includes('backup'))
    return 'A system data backup was created.';
  if (d.includes('restore'))
    return 'System data was restored from a backup.';

  return description; // fallback — return as-is if no match
};

/** Readable label for the subject (what record was acted upon) */
const humanizeSubject = (log) => {
  const props = log.properties ?? {};
  if (props.full_name) return props.full_name;
  const type = log.subject_type?.split('\\').pop();
  if (!type) return null;
  const typeMap = {
    Customer:         'Customer Record',
    CustomerDocument: 'Document',
    User:             'Staff Account',
  };
  return typeMap[type] ?? type;
};

const resolveLogMeta = (description = '', event = '') => {
  const d = description.toLowerCase();
  if (d.includes('login') && (d.includes('success') || d.includes('authenticated')))
    return { icon: FaSignInAlt,       color: 'text-green-600',  bg: 'bg-green-50',   badge: 'bg-green-100 text-green-700',    label: 'Signed In'       };
  if (d.includes('failed') || d.includes('invalid') || (d.includes('login') && d.includes('fail')))
    return { icon: FaExclamationTriangle, color: 'text-red-600', bg: 'bg-red-50',   badge: 'bg-red-100 text-red-700',        label: 'Login Failed'    };
  if (d.includes('logout') || d.includes('logged out'))
    return { icon: FaSignOutAlt,      color: 'text-gray-500',   bg: 'bg-gray-50',    badge: 'bg-gray-100 text-gray-600',      label: 'Signed Out'      };
  if (d.includes('locked'))
    return { icon: FaLock,            color: 'text-orange-600', bg: 'bg-orange-50',  badge: 'bg-orange-100 text-orange-700',  label: 'Account Locked'  };
  if (d.includes('unlock'))
    return { icon: FaUnlock,          color: 'text-yellow-600', bg: 'bg-yellow-50',  badge: 'bg-yellow-100 text-yellow-700',  label: 'Account Unlocked'};
  if (d.includes('password'))
    return { icon: FaKey,             color: 'text-purple-600', bg: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700',  label: 'Password Change' };
  if (d.includes('2fa') || d.includes('two-factor'))
    return { icon: FaShieldAlt,       color: 'text-indigo-600', bg: 'bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700',  label: '2-Step Verify'   };
  if (d.includes('document replaced'))
    return { icon: FaEdit,            color: 'text-cyan-600',   bg: 'bg-cyan-50',    badge: 'bg-cyan-100 text-cyan-700',      label: 'Doc Replaced'    };
  if (d.includes('document') || d.includes('sigcard') || d.includes('nais') || d.includes('privacy'))
    return { icon: FaFileAlt,         color: 'text-teal-600',   bg: 'bg-teal-50',    badge: 'bg-teal-100 text-teal-700',      label: 'Document'        };
  if ((d.includes('customer') || d.includes('sigcard record')) && (d.includes('creat') || event === 'created'))
    return { icon: FaIdCard,          color: 'text-blue-600',   bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',      label: 'Customer Added'  };
  if ((d.includes('customer') || d.includes('sigcard record')) && (d.includes('updat') || event === 'updated'))
    return { icon: FaEdit,            color: 'text-sky-600',    bg: 'bg-sky-50',     badge: 'bg-sky-100 text-sky-700',        label: 'Customer Updated'};
  if ((d.includes('customer') || d.includes('sigcard record')) && (d.includes('delet') || event === 'deleted'))
    return { icon: FaTrash,           color: 'text-red-500',    bg: 'bg-red-50',     badge: 'bg-red-100 text-red-600',        label: 'Customer Removed'};
  if (d.includes('user') && d.includes('creat'))
    return { icon: FaUserPlus,        color: 'text-green-600',  bg: 'bg-green-50',   badge: 'bg-green-100 text-green-700',    label: 'Staff Added'     };
  if (d.includes('user') && d.includes('updat'))
    return { icon: FaUserEdit,        color: 'text-blue-600',   bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',      label: 'Staff Updated'   };
  if (d.includes('user') && d.includes('delet'))
    return { icon: FaUserTimes,       color: 'text-red-600',    bg: 'bg-red-50',     badge: 'bg-red-100 text-red-700',        label: 'Staff Removed'   };
  if (d.includes('role') || d.includes('permission'))
    return { icon: FaUserShield,      color: 'text-violet-600', bg: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700',  label: 'Access Changed'  };
  if (d.includes('settings') || d.includes('system'))
    return { icon: FaCog,             color: 'text-slate-600',  bg: 'bg-slate-50',   badge: 'bg-slate-100 text-slate-700',    label: 'System'          };
  if (d.includes('backup') || d.includes('restore'))
    return { icon: FaDatabase,        color: 'text-amber-600',  bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700',    label: 'Backup'          };
  return     { icon: FaCheckCircle,   color: 'text-gray-500',   bg: 'bg-gray-50',    badge: 'bg-gray-100 text-gray-600',      label: 'Action'          };
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const formatRelative = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Before/After diff component ───────────────────────────────────────────────

const ValueBadge = ({ value, field }) => {
  if (value === null || value === undefined) {
    return <span className="italic text-gray-400 text-xs">not set</span>;
  }
  const v = String(value);
  if (field === 'status') {
    const cls = STATUS_COLORS[v] ?? 'bg-gray-100 text-gray-600';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{STATUS_LABELS[v] ?? v}</span>;
  }
  if (field === 'document_type') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">{DOC_TYPE_LABELS[v] ?? v}</span>;
  }
  if (field === 'file_size') {
    return <span className="text-xs text-gray-700">{formatBytes(v)}</span>;
  }
  if (field === 'person_index') {
    return <span className="text-xs text-gray-700">{personLabel(v)}</span>;
  }
  return <span className="text-xs text-gray-700 break-all">{v}</span>;
};

const DiffRow = ({ field, before, after }) => (
  <div className="flex items-start gap-2 py-2.5 border-b border-gray-100 last:border-0 flex-wrap">
    <span className="text-xs font-semibold text-gray-500 w-32 flex-shrink-0 pt-0.5">
      {FIELD_LABELS[field] ?? field.replace(/_/g, ' ')}
    </span>
    <div className="flex items-center gap-2 flex-wrap">
      <ValueBadge value={before} field={field} />
      <FaArrowRight className="text-gray-300 text-xs flex-shrink-0" />
      <ValueBadge value={after} field={field} />
    </div>
  </div>
);

const parseDiff = (properties) => {
  if (!properties) return null;

  if (properties.diff && typeof properties.diff === 'object') {
    return Object.entries(properties.diff).map(([field, { before, after }]) => ({
      field, before, after,
    }));
  }

  if (properties.old && properties.attributes) {
    return Object.keys(properties.attributes).map((field) => ({
      field,
      before: properties.old[field] ?? null,
      after:  properties.attributes[field],
    }));
  }

  if (!properties.old && properties.attributes) {
    return Object.entries(properties.attributes).map(([field, after]) => ({
      field, before: null, after,
    }));
  }

  if (properties.old && !properties.attributes) {
    return Object.entries(properties.old).map(([field, before]) => ({
      field, before, after: null,
    }));
  }

  return null;
};

/** Render document upload summary in human-readable form */
const DocumentsSummary = ({ docs }) => {
  if (!docs || typeof docs !== 'object') return null;
  const entries = Object.entries(docs).filter(([, count]) => Number(count) > 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {entries.map(([type, count]) => (
        <span key={type} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 font-medium">
          {DOC_TYPE_LABELS[type] ?? type}: {count}
        </span>
      ))}
    </div>
  );
};

/** Render meaningful meta properties, skipping technical noise */
const MetaProperties = ({ meta }) => {
  if (!meta || Object.keys(meta).length === 0) return null;
  const entries = Object.entries(meta).filter(([k]) => !META_EXCLUDE.has(k));
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {entries.map(([key, val]) => {
        const label = META_LABELS[key] ?? FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        // Documents uploaded — special rendering
        if (key === 'documents_uploaded' && typeof val === 'object') {
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
              <DocumentsSummary docs={val} />
            </div>
          );
        }

        // Filters object — show as readable list
        if (key === 'filters' && typeof val === 'object') {
          const visible = Object.entries(val).filter(([, v]) => v !== null && v !== '' && v !== undefined);
          if (visible.length === 0) return null;
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
              <div className="flex flex-wrap gap-1.5">
                {visible.map(([fk, fv]) => (
                  <span key={fk} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {fk.replace(/_/g, ' ')}: {String(fv)}
                  </span>
                ))}
              </div>
            </div>
          );
        }

        // Diff object — skip here (rendered separately via DiffRow)
        if (key === 'diff' || typeof val === 'object') return null;

        // person_index — humanize
        if (key === 'person_index') {
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm text-gray-700">{personLabel(val)}</p>
            </div>
          );
        }

        // file_size — humanize
        if (key === 'file_size') {
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm text-gray-700">{formatBytes(val)}</p>
            </div>
          );
        }

        // document_type
        if (key === 'document_type') {
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm text-gray-700">{DOC_TYPE_LABELS[val] ?? val}</p>
            </div>
          );
        }

        // status
        if (key === 'status') {
          const cls = STATUS_COLORS[val] ?? 'bg-gray-100 text-gray-600';
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{STATUS_LABELS[val] ?? val}</span>
            </div>
          );
        }

        return (
          <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm text-gray-700 break-words">{String(val)}</p>
          </div>
        );
      })}
    </div>
  );
};

// ── Properties panel ─────────────────────────────────────────────────────────
// ── Clickable image thumbnail with fullscreen preview ─────────────────────────
const ImageThumb = ({ src, label, borderColor = 'border-gray-200' }) => {
  const [preview, setPreview] = useState(false);
  return (
    <>
      <button onClick={() => setPreview(true)} className="text-left group">
        <div className={`rounded-lg border-2 ${borderColor} bg-white overflow-hidden hover:shadow-md transition-all`}>
          <img src={src} alt={label} className="w-full h-36 object-contain bg-white group-hover:opacity-90 transition-opacity" />
        </div>
        {label && <p className="text-[10px] text-gray-500 font-medium mt-1 truncate">{label}</p>}
      </button>
      {preview && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 z-10">
              <HiOutlineX className="w-4 h-4" />
            </button>
            <div className="bg-white rounded-xl shadow-2xl p-2">
              {label && <p className="text-xs font-semibold text-gray-700 mb-2 px-2">{label}</p>}
              <img src={src} alt={label} className="max-h-[80vh] rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Document replacement side-by-side comparison ──────────────────────────────
const DocComparisonPanel = ({ props }) => {
  const docType = DOC_TYPE_LABELS[props.document_type] ?? props.document_type ?? 'Document';
  const personSuffix = props.person_index > 1 ? ` (${personLabel(props.person_index)})` : '';

  return (
    <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl border border-gray-200 p-4 mt-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        Document Comparison — {docType}{personSuffix}
      </p>
      <div className="grid grid-cols-2 gap-4">
        {/* Old (Archived) */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[10px] font-bold text-orange-600 uppercase">Before (Archived)</span>
          </div>
          {props.archived_file_path ? (
            <ImageThumb src={storageUrl(props.archived_file_path)} label={props.replaced_file} borderColor="border-orange-200" />
          ) : (
            <div className="w-full h-36 rounded-lg border-2 border-dashed border-orange-200 bg-white flex items-center justify-center">
              <span className="text-xs text-gray-400">No archived image</span>
            </div>
          )}
        </div>
        {/* New (Current) */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-blue-600 uppercase">After (Current)</span>
          </div>
          {props.current_file_path ? (
            <ImageThumb src={storageUrl(props.current_file_path)} label={props.current_file_name ?? props.new_file_name} borderColor="border-blue-200" />
          ) : props.new_file_name ? (
            <div className="w-full h-36 rounded-lg border-2 border-dashed border-blue-200 bg-white flex items-center justify-center text-center px-2">
              <span className="text-xs text-gray-400">Document has since been replaced again</span>
            </div>
          ) : (
            <div className="w-full h-36 rounded-lg border-2 border-dashed border-blue-200 bg-white flex items-center justify-center">
              <span className="text-xs text-gray-400">No preview</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Status change visual card ─────────────────────────────────────────────────
const StatusChangePanel = ({ diff }) => {
  const statusRow = diff?.find((r) => r.field === 'status');
  const riskRow = diff?.find((r) => r.field === 'risk_level');
  if (!statusRow && !riskRow) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mt-2 space-y-3">
      {statusRow && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Account Status Change</p>
          <div className="flex items-center gap-3 flex-wrap">
            <ValueBadge value={statusRow.before} field="status" />
            <FaArrowRight className="text-gray-300 text-sm" />
            <ValueBadge value={statusRow.after} field="status" />
          </div>
        </div>
      )}
      {riskRow && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Risk Level Change</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-gray-600">{riskRow.before ?? 'not set'}</span>
            <FaArrowRight className="text-gray-300 text-sm" />
            <span className="text-xs font-medium text-gray-600">{riskRow.after ?? 'not set'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Current documents image gallery (for creation events) ─────────────────────
const CurrentDocsGallery = ({ docs }) => {
  if (!docs || !Array.isArray(docs) || docs.length === 0) return null;
  return (
    <div className="bg-green-50 rounded-xl border border-green-200 p-4 mt-2">
      <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-3">Current Document Images</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {docs.map((doc, idx) => {
          const label = (DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type) +
            (doc.person_index > 1 ? ` (P${doc.person_index})` : '');
          return (
            <ImageThumb key={idx} src={storageUrl(doc.file_path)} label={label} borderColor="border-green-200" />
          );
        })}
      </div>
    </div>
  );
};

// ── Properties panel (enhanced with images + status changes) ──────────────────
const PropertiesPanel = ({ log }) => {
  const props  = log.properties ?? {};
  const diff   = parseDiff(props);
  const meta   = Object.fromEntries(
    Object.entries(props).filter(([k]) => !['old', 'attributes', 'diff', 'current_file_path', 'current_file_name', 'current_documents'].includes(k))
  );
  const hasDiff = diff && diff.length > 0;
  const hasMeta = Object.keys(meta).length > 0;

  const desc = (log.description ?? '').toLowerCase();
  const isDocReplaced = desc.includes('replaced');
  const isCreated = desc.includes('created') || log.event === 'created';
  const hasStatusChange = hasDiff && diff.some((r) => r.field === 'status' || r.field === 'risk_level');

  if (!hasDiff && !hasMeta && !isDocReplaced) return <p className="text-xs text-gray-400 italic">No additional details.</p>;

  return (
    <div className="space-y-3">
      {/* Status/risk change visualization */}
      {hasStatusChange && <StatusChangePanel diff={diff} />}

      {/* Field changes table */}
      {hasDiff && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {log.event === 'created' ? 'Information Recorded' : log.event === 'deleted' ? 'Information at Time of Removal' : 'What Was Changed'}
          </p>
          <div className="bg-white rounded-lg border border-gray-100 px-3">
            {diff.filter((r) => !(hasStatusChange && (r.field === 'status' || r.field === 'risk_level'))).map((row) => (
              <DiffRow key={row.field} field={row.field} before={row.before} after={row.after} />
            ))}
          </div>
        </div>
      )}

      {/* Document replacement: side-by-side image comparison */}
      {isDocReplaced && (props.archived_file_path || props.current_file_path) && (
        <DocComparisonPanel props={props} />
      )}

      {/* Creation: show current document images */}
      {isCreated && props.current_documents && (
        <CurrentDocsGallery docs={props.current_documents} />
      )}

      {hasMeta && <MetaProperties meta={meta} />}
    </div>
  );
};

// ── History timeline modal ────────────────────────────────────────────────────
const HistoryModal = ({ subjectType, subjectId, subjectLabel, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getSubjectHistory(subjectType, subjectId)
      .then((res) => setHistory(res.data.history ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectType, subjectId]);

  const getEventIcon = (event) => {
    if (event === 'created') return <FaPlus className="w-3 h-3 text-green-600" />;
    if (event === 'deleted') return <FaTrash className="w-3 h-3 text-red-600" />;
    return <FaEdit className="w-3 h-3 text-blue-600" />;
  };

  const getEventColor = (event) => {
    if (event === 'created') return 'bg-green-50 border-green-200';
    if (event === 'deleted') return 'bg-red-50 border-red-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MdTimeline className="text-[#1877F2]" />
              Full Activity History
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {subjectLabel} — complete record of all changes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MdTimeline className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No history recorded yet.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />

              <div className="space-y-6">
                {history.map((entry, idx) => {
                  const diff = parseDiff({
                    old:        entry.old,
                    attributes: entry.attributes,
                    diff:       entry.diff,
                  });
                  const hasDiff = diff && diff.length > 0;
                  const meta = entry.meta ?? {};
                  const desc = (entry.description ?? '').toLowerCase();
                  const isDocReplaced = desc.includes('replaced');
                  const isCreated = desc.includes('created') || entry.event === 'created';
                  const hasStatusChange = hasDiff && diff.some((r) => r.field === 'status' || r.field === 'risk_level');

                  return (
                    <div key={entry.id} className="flex gap-4 relative">
                      {/* Timeline dot */}
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${getEventColor(entry.event)}`}>
                        {getEventIcon(entry.event)}
                      </div>

                      <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800">
                            {entry.causer?.name ?? 'System'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.event === 'created' ? 'bg-green-100 text-green-700' :
                            entry.event === 'deleted' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {entry.event === 'created' ? 'Record Created' : entry.event === 'deleted' ? 'Record Removed' : entry.event === 'updated' ? 'Record Updated' : 'Action'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{humanizeDescription(entry.description, entry.meta ?? entry)}</p>

                        {/* Status/risk change visualization */}
                        {hasStatusChange && <StatusChangePanel diff={diff} />}

                        {/* Diff table (excluding status/risk already shown above) */}
                        {hasDiff && (
                          <div className="bg-gray-50 rounded-xl px-3 border border-gray-100 mt-2">
                            {diff.filter((r) => !(hasStatusChange && (r.field === 'status' || r.field === 'risk_level'))).map((row) => (
                              <DiffRow key={row.field} field={row.field} before={row.before} after={row.after} />
                            ))}
                          </div>
                        )}

                        {/* Document replacement: side-by-side image comparison */}
                        {isDocReplaced && (meta.archived_file_path || meta.current_file_path) && (
                          <DocComparisonPanel props={meta} />
                        )}

                        {/* Creation: show current document images */}
                        {isCreated && meta.current_documents && (
                          <CurrentDocsGallery docs={meta.current_documents} />
                        )}

                        {/* Meta (exclude image-related keys already rendered above) */}
                        {meta && Object.keys(meta).filter(k => !['action', 'current_file_path', 'current_file_name', 'current_documents'].includes(k)).length > 0 && (
                          <MetaProperties meta={Object.fromEntries(
                            Object.entries(meta).filter(([k]) => !['action', 'current_file_path', 'current_file_name', 'current_documents'].includes(k))
                          )} />
                        )}

                        <p className="text-xs text-gray-400 mt-2" title={formatDate(entry.created_at)}>
                          {formatDate(entry.created_at)} &middot; {formatRelative(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, colorClass, bgClass }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4"
  >
    <div className={`${bgClass} p-3 rounded-xl`}>
      <Icon className={`w-5 h-5 ${colorClass}`} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString() ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </motion.div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AuditLogs = ({ apiEndpoint = '/admin/audit-logs' }) => {
  const [logs, setLogs]       = useState([]);
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow]   = useState(null);
  const [activeTab, setActiveTab]       = useState('all');
  const [showFilters, setShowFilters]   = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null); // { subjectType, subjectId, label }

  const [filters, setFilters] = useState({
    search: '', causer_id: '', date_from: '', date_to: '', per_page: 25,
  });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, category: activeTab, per_page: filters.per_page };
      if (filters.search)    params.search    = filters.search;
      if (filters.causer_id) params.causer_id = filters.causer_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to)   params.date_to   = filters.date_to;

      const res  = await api.get(apiEndpoint, { params });
      const body = res.data;
      const data = body.data;
      setLogs(data?.data ?? []);
      setStats(body.stats ?? null);
      if (body.users?.length) setUsers(body.users);
      setPagination({
        current_page: data?.current_page ?? 1,
        last_page:    data?.last_page    ?? 1,
        total:        data?.total        ?? 0,
        from:         data?.from         ?? 0,
        to:           data?.to           ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const getInitials = (log) => {
    if (!log.causer) return 'SY';
    const f = log.causer.firstname?.[0] ?? '';
    const l = log.causer.lastname?.[0]  ?? '';
    return (f + l).toUpperCase() || (log.causer.email?.[0]?.toUpperCase() ?? '?');
  };

  const getCauserName = (log) => {
    if (!log.causer) return 'System';
    if (log.causer.firstname) return `${log.causer.firstname} ${log.causer.lastname}`;
    return log.causer.email ?? 'Unknown';
  };

  const getSubjectLabel = (log) => humanizeSubject(log);

  const hasFiltersActive = filters.search || filters.causer_id || filters.date_from || filters.date_to;

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-5 shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #1877F2 0%, transparent 60%)' }} />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <MdHistory className="w-7 h-7 text-blue-400" />
              System Audit Logs
            </h1>
            <p className="mt-1 text-sm text-blue-200">
              A complete record of all activity in the system — who did what, and when.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                showFilters || hasFiltersActive
                  ? 'bg-[#1877F2] text-white border-[#1877F2]'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <MdFilterList className="w-4 h-4" />
              Filters {hasFiltersActive ? '●' : ''}
            </button>
            <button
              onClick={() => fetchLogs()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
            >
              <MdRefresh className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Activities Today"        value={stats?.total_today}    icon={MdHistory}             colorClass="text-blue-600"   bgClass="bg-blue-50"   />
        <StatCard label="Successful Logins Today" value={stats?.logins_today}   icon={FaSignInAlt}           colorClass="text-green-600"  bgClass="bg-green-50"  />
        <StatCard label="Failed Login Attempts"   value={stats?.failed_today}   icon={FaExclamationTriangle} colorClass="text-red-600"    bgClass="bg-red-50"    />
        <StatCard label="Customer Actions Today"  value={stats?.customer_ops}   icon={FaIdCard}              colorClass="text-indigo-600" bgClass="bg-indigo-50" />
        <StatCard label="Total Records (All-Time)"value={stats?.total_all_time} icon={FaDatabase}            colorClass="text-slate-600"  bgClass="bg-slate-50"  />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                  <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="search"
                      value={filters.search}
                      onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                      placeholder="Description or user name..."
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#1877F2]"
                    />
                  </div>
                </div>
                <div className="min-w-[170px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
                  <select
                    name="causer_id"
                    value={filters.causer_id}
                    onChange={(e) => setFilters((p) => ({ ...p, causer_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  >
                    <option value="">All Users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input type="date" name="date_from" value={filters.date_from}
                    onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input type="date" name="date_to" value={filters.date_to}
                    onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rows</label>
                  <select value={filters.per_page}
                    onChange={(e) => setFilters((p) => ({ ...p, per_page: Number(e.target.value) }))}
                    className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {hasFiltersActive && (
                  <button
                    onClick={() => setFilters({ search: '', causer_id: '', date_from: '', date_to: '', per_page: 25 })}
                    className="flex items-center gap-1 px-3 py-2.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <MdClose className="w-4 h-4" /> Reset
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {CATEGORIES.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setExpandedRow(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active ? 'bg-white text-[#1877F2] shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#1877F2]' : ''}`} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Logs Feed ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="w-9 h-9 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <MdHistory className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No audit logs found</p>
            <p className="text-sm mt-1">Try a different tab or adjust your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const meta     = resolveLogMeta(log.description, log.event);
              const Icon     = meta.icon;
              const expanded = expandedRow === log.id;
              const subject  = getSubjectLabel(log);
              const props    = log.properties ?? {};
              const hasProps = Object.keys(props).length > 0;
              const ipAddr   = props.ip_address ?? props.ip ?? null;

              // Detect if this is a customer or document log (can open history)
              const subjectType = log.subject_type?.toLowerCase().includes('customer') && !log.subject_type?.toLowerCase().includes('document')
                ? 'customer'
                : log.subject_type?.toLowerCase().includes('customerdocument')
                ? 'document'
                : null;

              return (
                <div key={log.id}>
                  <div
                    className={`flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50 ${expanded ? 'bg-blue-50/40' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#05173a] to-[#1877F2] flex items-center justify-center text-white text-xs font-bold shadow-sm mt-0.5 select-none">
                      {getInitials(log)}
                    </div>

                    {/* Category icon */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center mt-0.5`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => hasProps && setExpandedRow(expanded ? null : log.id)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{getCauserName(log)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>{meta.label}</span>
                        {subject && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">{subject}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">{humanizeDescription(log.description, log.properties)}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                        {ipAddr && <span className="text-xs text-gray-400 font-mono">IP: {ipAddr}</span>}
                        <span className="text-xs text-blue-400">{formatRelative(log.created_at)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      {/* History button — only for customer/document subjects */}
                      {subjectType && log.subject_id && (
                        <button
                          onClick={() => setHistoryTarget({
                            subjectType,
                            subjectId:    log.subject_id,
                            subjectLabel: subject ?? log.description,
                          })}
                          className="p-1.5 rounded-lg text-[#1877F2] hover:bg-blue-50 transition-colors"
                          title="View full history"
                        >
                          <MdTimeline className="w-5 h-5" />
                        </button>
                      )}
                      {/* Expand toggle */}
                      {hasProps && (
                        <button
                          onClick={() => setExpandedRow(expanded ? null : log.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          {expanded ? <MdExpandLess className="w-5 h-5" /> : <MdExpandMore className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {expanded && hasProps && (
                      <motion.div
                        key="detail"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-2 bg-blue-50/40 border-t border-blue-100">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            What Happened
                          </p>
                          <PropertiesPanel log={log} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {!loading && logs.length > 0 && (
        <Pagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          total={pagination.total}
          from={pagination.from}
          to={pagination.to}
          onPageChange={(page) => fetchLogs(page)}
        />
      )}

      {/* ── History Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {historyTarget && (
          <HistoryModal
            subjectType={historyTarget.subjectType}
            subjectId={historyTarget.subjectId}
            subjectLabel={historyTarget.subjectLabel}
            onClose={() => setHistoryTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogs;
