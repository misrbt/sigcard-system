import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdSearch, MdRefresh, MdExpandMore, MdExpandLess,
  MdFilterList, MdClose, MdHistory, MdSecurity,
  MdPerson, MdSettings, MdLogin, MdBadge, MdTimeline,
  MdAccessTime, MdVisibility, MdDownload,
} from 'react-icons/md';
import {
  FaIdCard, FaUserShield, FaSignInAlt, FaSignOutAlt,
  FaUserPlus, FaUserEdit, FaUserTimes, FaKey, FaLock,
  FaUnlock, FaShieldAlt, FaDatabase, FaFileAlt,
  FaExclamationTriangle, FaCheckCircle, FaCog, FaArrowRight,
  FaPlus, FaTrash, FaEdit, FaCalendarAlt,
} from 'react-icons/fa';
import { HiOutlineX, HiOutlineClock, HiOutlineCollection, HiOutlineChevronLeft, HiOutlinePhotograph } from 'react-icons/hi';
import { adminService } from '../../services/adminService';
import api from '../../services/api';
import Pagination from '../../components/ui/Pagination';

const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',             label: 'All Activity',     icon: MdHistory,  color: 'blue'   },
  { key: 'login',           label: 'Login Activity',   icon: MdLogin,    color: 'green'  },
  { key: 'customer',        label: 'Customer Records', icon: MdBadge,    color: 'indigo' },
  { key: 'user_management', label: 'Staff Accounts',   icon: MdPerson,   color: 'purple' },
  { key: 'security',        label: 'Security',         icon: MdSecurity, color: 'red'    },
  { key: 'system',          label: 'System',           icon: MdSettings, color: 'slate'  },
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
  active:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  dormant: 'bg-amber-100 text-amber-700 border border-amber-200',
  escheat: 'bg-orange-100 text-orange-700 border border-orange-200',
  closed:  'bg-red-100 text-red-700 border border-red-200',
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

const META_EXCLUDE = new Set([
  'action', 'log_name', 'ip_address', 'user_agent',
]);

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

// Severity mapping for left-border color coding
const SEVERITY_MAP = {
  success:  { border: 'border-l-emerald-400', dot: 'bg-emerald-400' },
  info:     { border: 'border-l-blue-400',    dot: 'bg-blue-400'    },
  warning:  { border: 'border-l-amber-400',   dot: 'bg-amber-400'   },
  danger:   { border: 'border-l-red-400',     dot: 'bg-red-400'     },
  neutral:  { border: 'border-l-gray-300',    dot: 'bg-gray-300'    },
};

const getSeverity = (description = '') => {
  const d = description.toLowerCase();
  if (d.includes('fail') || d.includes('locked') || d.includes('delet') || d.includes('too many'))
    return 'danger';
  if (d.includes('success') || d.includes('authenticated') || d.includes('creat') || d.includes('unlock'))
    return 'success';
  if (d.includes('security') || d.includes('password') || d.includes('2fa') || d.includes('permission') || d.includes('role'))
    return 'warning';
  if (d.includes('updat') || d.includes('replaced') || d.includes('changed'))
    return 'info';
  return 'neutral';
};

const formatBytes = (bytes) => {
  const n = Number(bytes);
  if (isNaN(n)) return bytes;
  if (n < 1024)       return `${n} B`;
  if (n < 1048576)    return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
};

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const personLabel = (index) => {
  const n = Number(index);
  if (n === 1) return 'Primary Account Holder';
  return `${ordinal(n)} Account Holder (Joint)`;
};

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

  return description;
};

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
    return { icon: FaSignInAlt,       color: 'text-emerald-600', bg: 'bg-emerald-50',  badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',   label: 'Signed In'       };
  if (d.includes('failed') || d.includes('invalid') || (d.includes('login') && d.includes('fail')))
    return { icon: FaExclamationTriangle, color: 'text-red-600', bg: 'bg-red-50',     badge: 'bg-red-100 text-red-700 border border-red-200',               label: 'Login Failed'    };
  if (d.includes('logout') || d.includes('logged out'))
    return { icon: FaSignOutAlt,      color: 'text-gray-500',    bg: 'bg-gray-50',     badge: 'bg-gray-100 text-gray-600 border border-gray-200',            label: 'Signed Out'      };
  if (d.includes('locked'))
    return { icon: FaLock,            color: 'text-orange-600',  bg: 'bg-orange-50',   badge: 'bg-orange-100 text-orange-700 border border-orange-200',      label: 'Account Locked'  };
  if (d.includes('unlock'))
    return { icon: FaUnlock,          color: 'text-yellow-600',  bg: 'bg-yellow-50',   badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200',      label: 'Account Unlocked'};
  if (d.includes('password'))
    return { icon: FaKey,             color: 'text-purple-600',  bg: 'bg-purple-50',   badge: 'bg-purple-100 text-purple-700 border border-purple-200',      label: 'Password Change' };
  if (d.includes('2fa') || d.includes('two-factor'))
    return { icon: FaShieldAlt,       color: 'text-indigo-600',  bg: 'bg-indigo-50',   badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200',      label: '2-Step Verify'   };
  if (d.includes('document replaced'))
    return { icon: FaEdit,            color: 'text-cyan-600',    bg: 'bg-cyan-50',     badge: 'bg-cyan-100 text-cyan-700 border border-cyan-200',            label: 'Doc Replaced'    };
  if (d.includes('document') || d.includes('sigcard') || d.includes('nais') || d.includes('privacy'))
    return { icon: FaFileAlt,         color: 'text-teal-600',    bg: 'bg-teal-50',     badge: 'bg-teal-100 text-teal-700 border border-teal-200',            label: 'Document'        };
  if ((d.includes('customer') || d.includes('sigcard record')) && (d.includes('creat') || event === 'created'))
    return { icon: FaIdCard,          color: 'text-blue-600',    bg: 'bg-blue-50',     badge: 'bg-blue-100 text-blue-700 border border-blue-200',            label: 'Customer Added'  };
  if ((d.includes('customer') || d.includes('sigcard record')) && (d.includes('updat') || event === 'updated'))
    return { icon: FaEdit,            color: 'text-sky-600',     bg: 'bg-sky-50',      badge: 'bg-sky-100 text-sky-700 border border-sky-200',               label: 'Customer Updated'};
  if ((d.includes('customer') || d.includes('sigcard record')) && (d.includes('delet') || event === 'deleted'))
    return { icon: FaTrash,           color: 'text-red-500',     bg: 'bg-red-50',      badge: 'bg-red-100 text-red-600 border border-red-200',               label: 'Customer Removed'};
  if (d.includes('user') && d.includes('creat'))
    return { icon: FaUserPlus,        color: 'text-emerald-600', bg: 'bg-emerald-50',  badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',   label: 'Staff Added'     };
  if (d.includes('user') && d.includes('updat'))
    return { icon: FaUserEdit,        color: 'text-blue-600',    bg: 'bg-blue-50',     badge: 'bg-blue-100 text-blue-700 border border-blue-200',            label: 'Staff Updated'   };
  if (d.includes('user') && d.includes('delet'))
    return { icon: FaUserTimes,       color: 'text-red-600',     bg: 'bg-red-50',      badge: 'bg-red-100 text-red-700 border border-red-200',               label: 'Staff Removed'   };
  if (d.includes('role') || d.includes('permission'))
    return { icon: FaUserShield,      color: 'text-violet-600',  bg: 'bg-violet-50',   badge: 'bg-violet-100 text-violet-700 border border-violet-200',      label: 'Access Changed'  };
  if (d.includes('settings') || d.includes('system'))
    return { icon: FaCog,             color: 'text-slate-600',   bg: 'bg-slate-50',    badge: 'bg-slate-100 text-slate-700 border border-slate-200',         label: 'System'          };
  if (d.includes('backup') || d.includes('restore'))
    return { icon: FaDatabase,        color: 'text-amber-600',   bg: 'bg-amber-50',    badge: 'bg-amber-100 text-amber-700 border border-amber-200',        label: 'Backup'          };
  return     { icon: FaCheckCircle,   color: 'text-gray-500',    bg: 'bg-gray-50',     badge: 'bg-gray-100 text-gray-600 border border-gray-200',            label: 'Action'          };
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
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
};

// ── Before/After diff component ───────────────────────────────────────────────

const ValueBadge = ({ value, field }) => {
  if (value === null || value === undefined) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs italic text-gray-400 bg-gray-50 border border-dashed border-gray-200">not set</span>;
  }
  const v = String(value);
  if (field === 'status') {
    const cls = STATUS_COLORS[v] ?? 'bg-gray-100 text-gray-600';
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{STATUS_LABELS[v] ?? v}</span>;
  }
  if (field === 'document_type') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">{DOC_TYPE_LABELS[v] ?? v}</span>;
  }
  if (field === 'file_size') {
    return <span className="text-xs font-medium text-gray-700 font-mono">{formatBytes(v)}</span>;
  }
  if (field === 'person_index') {
    return <span className="text-xs font-medium text-gray-700">{personLabel(v)}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 break-all">{v}</span>;
};

const DiffRow = ({ field, before, after }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100/80 last:border-0">
    <span className="text-xs font-semibold text-gray-500 w-36 flex-shrink-0 pt-0.5 uppercase tracking-wide">
      {FIELD_LABELS[field] ?? field.replace(/_/g, ' ')}
    </span>
    <div className="flex items-center gap-2 flex-wrap min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0" />
        <ValueBadge value={before} field={field} />
      </div>
      <FaArrowRight className="text-gray-300 text-[10px] flex-shrink-0" />
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
        <ValueBadge value={after} field={field} />
      </div>
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

const DocumentsSummary = ({ docs }) => {
  if (!docs || typeof docs !== 'object') return null;
  const entries = Object.entries(docs).filter(([, count]) => Number(count) > 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {entries.map(([type, count]) => (
        <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-teal-50 text-teal-700 font-medium border border-teal-200">
          {DOC_TYPE_LABELS[type] ?? type}: {count}
        </span>
      ))}
    </div>
  );
};

const MetaProperties = ({ meta }) => {
  if (!meta || Object.keys(meta).length === 0) return null;
  const entries = Object.entries(meta).filter(([k]) => !META_EXCLUDE.has(k));
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      {entries.map(([key, val]) => {
        const label = META_LABELS[key] ?? FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        if (key === 'documents_uploaded' && typeof val === 'object') {
          return (
            <div key={key} className="sm:col-span-2 bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</p>
              <DocumentsSummary docs={val} />
            </div>
          );
        }

        if (key === 'filters' && typeof val === 'object') {
          const visible = Object.entries(val).filter(([, v]) => v !== null && v !== '' && v !== undefined);
          if (visible.length === 0) return null;
          return (
            <div key={key} className="sm:col-span-2 bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</p>
              <div className="flex flex-wrap gap-1.5">
                {visible.map(([fk, fv]) => (
                  <span key={fk} className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200 font-mono">
                    {fk.replace(/_/g, ' ')}: {String(fv)}
                  </span>
                ))}
              </div>
            </div>
          );
        }

        if (key === 'diff' || typeof val === 'object') return null;

        if (key === 'person_index') {
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-gray-700 font-medium">{personLabel(val)}</p>
            </div>
          );
        }

        if (key === 'file_size') {
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-gray-700 font-mono">{formatBytes(val)}</p>
            </div>
          );
        }

        if (key === 'document_type') {
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-gray-700">{DOC_TYPE_LABELS[val] ?? val}</p>
            </div>
          );
        }

        if (key === 'status') {
          const cls = STATUS_COLORS[val] ?? 'bg-gray-100 text-gray-600';
          return (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{label}</p>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{STATUS_LABELS[val] ?? val}</span>
            </div>
          );
        }

        return (
          <div key={key} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">{label}</p>
            <p className="text-sm text-gray-700 break-words">{String(val)}</p>
          </div>
        );
      })}
    </div>
  );
};

// ── Clickable image thumbnail with fullscreen preview ─────────────────────────
const ImageThumb = ({ src, label, borderColor = 'border-gray-200' }) => {
  const [preview, setPreview] = useState(false);
  return (
    <>
      <button onClick={() => setPreview(true)} className="text-left group">
        <div className={`rounded-xl border-2 ${borderColor} bg-white overflow-hidden hover:shadow-lg transition-all duration-200`}>
          <img src={src} alt={label} className="w-full h-36 object-contain bg-white group-hover:scale-105 transition-transform duration-200" />
        </div>
        {label && <p className="text-[10px] text-gray-500 font-medium mt-1.5 truncate">{label}</p>}
      </button>
      {preview && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 z-10 transition-colors">
              <HiOutlineX className="w-4 h-4" />
            </button>
            <div className="bg-white rounded-2xl shadow-2xl p-3">
              {label && <p className="text-xs font-semibold text-gray-700 mb-2 px-2">{label}</p>}
              <img src={src} alt={label} className="max-h-[80vh] rounded-xl object-contain" />
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
    <div className="bg-gradient-to-r from-orange-50/80 to-blue-50/80 rounded-xl border border-gray-200 p-5 mt-3">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <MdVisibility className="w-3.5 h-3.5" />
        Document Comparison — {docType}{personSuffix}
      </p>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-200" />
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Before (Archived)</span>
          </div>
          {props.archived_file_path ? (
            <ImageThumb src={storageUrl(props.archived_file_path)} label={props.replaced_file} borderColor="border-orange-200" />
          ) : (
            <div className="w-full h-36 rounded-xl border-2 border-dashed border-orange-200 bg-white flex items-center justify-center">
              <span className="text-xs text-gray-400 italic">No archived image</span>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">After (Current)</span>
          </div>
          {props.current_file_path ? (
            <ImageThumb src={storageUrl(props.current_file_path)} label={props.current_file_name ?? props.new_file_name} borderColor="border-blue-200" />
          ) : props.new_file_name ? (
            <div className="w-full h-36 rounded-xl border-2 border-dashed border-blue-200 bg-white flex items-center justify-center text-center px-2">
              <span className="text-xs text-gray-400 italic">Document has since been replaced again</span>
            </div>
          ) : (
            <div className="w-full h-36 rounded-xl border-2 border-dashed border-blue-200 bg-white flex items-center justify-center">
              <span className="text-xs text-gray-400 italic">No preview</span>
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 mt-3 space-y-3 shadow-sm">
      {statusRow && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Account Status Change</p>
          <div className="flex items-center gap-3 flex-wrap">
            <ValueBadge value={statusRow.before} field="status" />
            <div className="flex items-center gap-1">
              <span className="w-6 h-px bg-gray-300" />
              <FaArrowRight className="text-gray-400 text-xs" />
              <span className="w-6 h-px bg-gray-300" />
            </div>
            <ValueBadge value={statusRow.after} field="status" />
          </div>
        </div>
      )}
      {riskRow && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Risk Level Change</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-gray-600 px-2.5 py-0.5 bg-gray-50 border border-gray-200 rounded-full">{riskRow.before ?? 'not set'}</span>
            <div className="flex items-center gap-1">
              <span className="w-6 h-px bg-gray-300" />
              <FaArrowRight className="text-gray-400 text-xs" />
              <span className="w-6 h-px bg-gray-300" />
            </div>
            <span className="text-xs font-semibold text-gray-600 px-2.5 py-0.5 bg-gray-50 border border-gray-200 rounded-full">{riskRow.after ?? 'not set'}</span>
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
    <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-4 mt-3">
      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3">Current Document Images</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {docs.map((doc, idx) => {
          const label = (DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type) +
            (doc.person_index > 1 ? ` (P${doc.person_index})` : '');
          return (
            <ImageThumb key={idx} src={storageUrl(doc.file_path)} label={label} borderColor="border-emerald-200" />
          );
        })}
      </div>
    </div>
  );
};

// ── Properties panel (enhanced) ───────────────────────────────────────────────
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

  if (!hasDiff && !hasMeta && !isDocReplaced) return <p className="text-xs text-gray-400 italic py-2">No additional details recorded for this action.</p>;

  return (
    <div className="space-y-3">
      {hasStatusChange && <StatusChangePanel diff={diff} />}

      {hasDiff && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-blue-400" />
            {log.event === 'created' ? 'Information Recorded' : log.event === 'deleted' ? 'Information at Time of Removal' : 'What Was Changed'}
          </p>
          <div className="bg-white rounded-xl border border-gray-100 px-4 shadow-sm">
            {diff.filter((r) => !(hasStatusChange && (r.field === 'status' || r.field === 'risk_level'))).map((row) => (
              <DiffRow key={row.field} field={row.field} before={row.before} after={row.after} />
            ))}
          </div>
        </div>
      )}

      {isDocReplaced && (props.archived_file_path || props.current_file_path) && (
        <DocComparisonPanel props={props} />
      )}

      {isCreated && props.current_documents && (
        <CurrentDocsGallery docs={props.current_documents} />
      )}

      {hasMeta && <MetaProperties meta={meta} />}
    </div>
  );
};

// ── History timeline modal (enhanced with status timeline & doc versions) ─────

const HIST_STATUS_COLORS = {
  active:      { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  dormant:     { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  closed:      { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
  escheat:     { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  reactivated: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', dot: 'bg-teal-500' },
};

const formatDateTimeFull = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

// Clickable image thumbnail for version history
const VersionThumb = ({ path, label, borderColor = 'border-gray-200' }) => {
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState(false);
  return (
    <>
      <button onClick={() => setPreview(true)} className="text-left group">
        <div className={`rounded-lg border-2 ${borderColor} bg-white overflow-hidden hover:shadow-lg transition-all duration-200`}>
          {!error ? (
            <img src={storageUrl(path)} alt={label} className="w-full h-28 object-contain bg-white group-hover:scale-105 transition-transform duration-200" onError={() => setError(true)} />
          ) : (
            <div className="w-full h-28 flex items-center justify-center bg-gray-50">
              <HiOutlinePhotograph className="w-5 h-5 text-gray-300" />
            </div>
          )}
        </div>
        {label && <p className="text-[10px] text-gray-500 font-medium mt-1 truncate">{label}</p>}
      </button>
      {preview && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 z-10 transition-colors">
              <HiOutlineX className="w-4 h-4" />
            </button>
            <div className="bg-white rounded-2xl shadow-2xl p-3">
              {label && <p className="text-xs font-semibold text-gray-700 mb-2 px-2">{label}</p>}
              <img src={storageUrl(path)} alt={label} className="max-h-[80vh] rounded-xl object-contain" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Status timeline within the history modal
const HistoryStatusTimeline = ({ timeline }) => {
  if (!timeline || timeline.length <= 1) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <HiOutlineClock className="w-4 h-4 text-blue-500" />
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Account Status Timeline</p>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600">{timeline.length}</span>
      </div>
      <div className="relative">
        <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-green-300 via-blue-200 to-gray-200" />
        <div className="space-y-0">
          {timeline.map((entry, idx) => {
            const sc = HIST_STATUS_COLORS[entry.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', dot: 'bg-gray-400' };
            const isFirst = idx === 0;
            const isLast = idx === timeline.length - 1;
            return (
              <div key={idx} className="flex items-start gap-3 relative">
                <div className={`relative z-10 w-[24px] h-[24px] rounded-full flex items-center justify-center flex-shrink-0 ${isLast ? 'ring-3 ring-blue-100' : ''}`}>
                  <div className={`w-3 h-3 rounded-full ${sc.dot} ${isLast ? 'w-3.5 h-3.5 ring-2 ring-white shadow-sm' : ''}`} />
                </div>
                <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {entry.status ?? '—'}
                    </span>
                    {isFirst && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-50 text-green-600 border border-green-200">INITIAL</span>}
                    {isLast && !isFirst && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-600 border border-blue-200">CURRENT</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                    <span className="text-[10px] text-gray-400">{formatDateTimeFull(entry.changed_at)}</span>
                    <span className="text-[10px] text-blue-400 font-medium">{timeAgo(entry.changed_at)}</span>
                    {entry.changed_by && <span className="text-[10px] text-gray-400">by <span className="font-medium text-gray-500">{entry.changed_by}</span></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Document version history within the history modal
const HistoryDocVersions = ({ versions = [], currentDocuments = [] }) => {
  // Build combined view
  const docGroups = {};
  currentDocuments.forEach((doc) => {
    const key = doc.document_type + (doc.person_index > 1 ? `_p${doc.person_index}` : '');
    if (!docGroups[key]) docGroups[key] = { document_type: doc.document_type, person_index: doc.person_index, current: doc, archived: [] };
    else docGroups[key].current = doc;
  });
  versions.forEach((v) => {
    const key = v.document_type + (v.person_index > 1 ? `_p${v.person_index}` : '');
    if (!docGroups[key]) docGroups[key] = { document_type: v.document_type, person_index: v.person_index, current: null, archived: [] };
    docGroups[key].archived.push(...(v.versions ?? []));
  });

  const groupsWithHistory = Object.values(docGroups).filter((g) => g.archived.length > 0);
  if (groupsWithHistory.length === 0) return null;

  const totalVersions = groupsWithHistory.reduce((sum, g) => sum + g.archived.length, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <HiOutlineCollection className="w-4 h-4 text-purple-500" />
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Document Version History</p>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600">
          {totalVersions} previous version{totalVersions !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-5">
        {groupsWithHistory.map((group) => {
          const label = DOC_TYPE_LABELS[group.document_type] ?? group.document_type;
          const personSuffix = group.person_index > 1 ? ` (Person ${group.person_index})` : '';
          const sortedArchived = [...group.archived].sort((a, b) => new Date(b.replaced_at) - new Date(a.replaced_at));

          return (
            <div key={group.document_type + '_' + group.person_index}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}{personSuffix}</p>
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {/* Current */}
                {group.current && (
                  <div className="flex-shrink-0 w-32">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[8px] font-bold text-green-600 uppercase">Current</span>
                    </div>
                    <VersionThumb path={group.current.file_path} label={group.current.file_name} borderColor="border-green-200" />
                  </div>
                )}
                {group.current && sortedArchived.length > 0 && (
                  <div className="flex items-center flex-shrink-0 px-0.5">
                    <div className="flex flex-col items-center gap-0.5">
                      <HiOutlineChevronLeft className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-[7px] text-gray-400 font-medium">replaced</span>
                    </div>
                  </div>
                )}
                {/* Archived versions */}
                {sortedArchived.map((version, vIdx) => (
                  <div key={vIdx} className="flex-shrink-0 w-32">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="text-[8px] font-bold text-orange-500 uppercase">V{sortedArchived.length - vIdx}</span>
                    </div>
                    {version.archived_file_path ? (
                      <VersionThumb path={version.archived_file_path} label={version.replaced_file} borderColor="border-orange-200" />
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-orange-200 bg-white h-28 flex items-center justify-center">
                        <span className="text-[9px] text-gray-400 italic">Archived</span>
                      </div>
                    )}
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[8px] text-gray-400">{formatDateTimeFull(version.replaced_at)}</p>
                      {version.replaced_by && <p className="text-[8px] text-gray-400">by <span className="font-medium text-gray-500">{version.replaced_by}</span></p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Tab buttons for the history modal
const HISTORY_TABS = [
  { key: 'timeline',   label: 'Activity Timeline', icon: MdTimeline },
  { key: 'status',     label: 'Status History',    icon: HiOutlineClock },
  { key: 'documents',  label: 'Document Versions', icon: HiOutlineCollection },
];

const HistoryModal = ({ subjectType, subjectId, subjectLabel, onClose, apiEndpoint }) => {
  const [history, setHistory] = useState([]);
  const [statusTimeline, setStatusTimeline] = useState([]);
  const [documentVersions, setDocumentVersions] = useState([]);
  const [currentDocuments, setCurrentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeHistTab, setActiveHistTab] = useState('timeline');

  useEffect(() => {
    const historyBase = apiEndpoint.replace(/\/audit-logs$/, '');
    const url = `${historyBase}/audit-logs/history/${subjectType}/${subjectId}`;
    api.get(url)
      .then((res) => {
        setHistory(res.data.history ?? []);
        setStatusTimeline(res.data.status_timeline ?? []);
        setDocumentVersions(res.data.document_versions ?? []);
        setCurrentDocuments(res.data.current_documents ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectType, subjectId, apiEndpoint]);

  const isCustomer = subjectType === 'customer';
  const hasStatusTimeline = isCustomer && statusTimeline.length > 1;
  const hasDocVersions = isCustomer && documentVersions.length > 0;

  const getEventIcon = (event, description = '') => {
    const d = description.toLowerCase();
    if (d.includes('replaced')) return <FaEdit className="w-3 h-3 text-orange-600" />;
    if (d.includes('deleted') && d.includes('doc')) return <FaTrash className="w-3 h-3 text-red-500" />;
    if (event === 'created') return <FaPlus className="w-3 h-3 text-emerald-600" />;
    if (event === 'deleted') return <FaTrash className="w-3 h-3 text-red-600" />;
    return <FaEdit className="w-3 h-3 text-blue-600" />;
  };

  const getEventColor = (event, description = '') => {
    const d = description.toLowerCase();
    if (d.includes('replaced')) return 'bg-orange-50 border-orange-300';
    if (d.includes('deleted') && d.includes('doc')) return 'bg-red-50 border-red-300';
    if (event === 'created') return 'bg-emerald-50 border-emerald-300';
    if (event === 'deleted') return 'bg-red-50 border-red-300';
    return 'bg-blue-50 border-blue-300';
  };

  const getEventBadge = (event, description = '') => {
    const d = description.toLowerCase();
    if (d.includes('replaced')) return 'bg-orange-100 text-orange-700 border border-orange-200';
    if (d.includes('deleted') && d.includes('doc')) return 'bg-red-100 text-red-700 border border-red-200';
    if (d.includes('account') && d.includes('added')) return 'bg-purple-100 text-purple-700 border border-purple-200';
    if (event === 'created') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (event === 'deleted') return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  };

  const getEventLabel = (event, description = '') => {
    const d = description.toLowerCase();
    if (d.includes('replaced')) return 'Doc Replaced';
    if (d.includes('deleted') && d.includes('doc')) return 'Doc Deleted';
    if (d.includes('account') && d.includes('added')) return 'Account Added';
    if (d.includes('account') && d.includes('updated')) return 'Account Updated';
    if (event === 'created') return 'Created';
    if (event === 'deleted') return 'Removed';
    if (event === 'updated') return 'Updated';
    return 'Action';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white rounded-t-2xl border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <MdTimeline className="text-[#1877F2] w-5 h-5" />
              </div>
              Customer Activity History
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 ml-10">
              {subjectLabel} — complete timeline of all changes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs for customer subjects */}
        {isCustomer && !loading && (hasStatusTimeline || hasDocVersions) && (
          <div className="px-6 py-2 bg-white border-b border-gray-100">
            <div className="flex gap-1">
              {HISTORY_TABS.map(({ key, label, icon: Icon }) => {
                if (key === 'status' && !hasStatusTimeline) return null;
                if (key === 'documents' && !hasDocVersions) return null;
                const active = activeHistTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveHistTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active ? 'bg-[#05173a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-300' : ''}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
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
          ) : (
            <>
              {/* Status Timeline Tab */}
              {activeHistTab === 'status' && hasStatusTimeline && (
                <HistoryStatusTimeline timeline={statusTimeline} />
              )}

              {/* Document Versions Tab */}
              {activeHistTab === 'documents' && hasDocVersions && (
                <HistoryDocVersions versions={documentVersions} currentDocuments={currentDocuments} />
              )}

              {/* Activity Timeline Tab */}
              {activeHistTab === 'timeline' && (
                <>
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                        <MdTimeline className="w-8 h-8 opacity-30" />
                      </div>
                      <p className="text-sm font-medium">No history recorded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Changes to this record will appear here</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-gray-200 to-gray-100" />

                      <div className="space-y-1">
                        {history.map((entry) => {
                          const diff = parseDiff({
                            old:        entry.old,
                            attributes: entry.attributes,
                            diff:       entry.diff,
                          });
                          const hasDiff = diff && diff.length > 0;
                          const meta = entry.meta ?? {};
                          const desc = (entry.description ?? '').toLowerCase();
                          const isDocReplaced = desc.includes('replaced');
                          const isDocDeleted = desc.includes('deleted') && desc.includes('doc');
                          const isCreated = desc.includes('created') || entry.event === 'created';
                          const hasStatusChange = hasDiff && diff.some((r) => r.field === 'status' || r.field === 'risk_level');

                          return (
                            <div key={entry.id} className="flex gap-4 relative group">
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${getEventColor(entry.event, entry.description)} shadow-sm`}>
                                {getEventIcon(entry.event, entry.description)}
                              </div>

                              <div className="flex-1 pb-4 bg-white rounded-xl border border-gray-100 p-4 mb-2 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <span className="text-sm font-semibold text-gray-800">
                                    {entry.causer?.name ?? 'System'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getEventBadge(entry.event, entry.description)}`}>
                                    {getEventLabel(entry.event, entry.description)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2 leading-relaxed">{humanizeDescription(entry.description, entry.meta ?? entry)}</p>

                                {hasStatusChange && <StatusChangePanel diff={diff} />}

                                {hasDiff && (
                                  <div className="bg-gray-50/80 rounded-xl px-3 border border-gray-100 mt-2">
                                    {diff.filter((r) => !(hasStatusChange && (r.field === 'status' || r.field === 'risk_level'))).map((row) => (
                                      <DiffRow key={row.field} field={row.field} before={row.before} after={row.after} />
                                    ))}
                                  </div>
                                )}

                                {isDocReplaced && (meta.archived_file_path || meta.current_file_path) && (
                                  <DocComparisonPanel props={meta} />
                                )}

                                {isCreated && meta.current_documents && (
                                  <CurrentDocsGallery docs={meta.current_documents} />
                                )}

                                {/* Document deleted info */}
                                {isDocDeleted && (meta.file_name || meta.file_path) && (
                                  <div className="bg-red-50/70 rounded-xl border border-red-200 px-4 py-3 mt-2">
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">
                                      Deleted — {DOC_TYPE_LABELS[meta.document_type] ?? meta.document_type ?? '--'}
                                      {meta.person_index > 1 && ` (Person ${meta.person_index})`}
                                    </p>
                                    <p className="text-[11px] text-gray-600 font-mono">{meta.file_name ?? meta.file_path?.split('/').pop()}</p>
                                  </div>
                                )}

                                {meta && Object.keys(meta).filter(k => !['action', 'current_file_path', 'current_file_name', 'current_documents', 'archived_file_path', 'file_name', 'file_path'].includes(k)).length > 0 && (
                                  <MetaProperties meta={Object.fromEntries(
                                    Object.entries(meta).filter(([k]) => !['action', 'current_file_path', 'current_file_name', 'current_documents', 'archived_file_path', 'file_name', 'file_path'].includes(k))
                                  )} />
                                )}

                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-50">
                                  <MdAccessTime className="w-3 h-3 text-gray-300" />
                                  <span className="text-[11px] text-gray-400">{formatDate(entry.created_at)}</span>
                                  <span className="text-[11px] text-blue-400 font-medium">{formatRelative(entry.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
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
    className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4"
  >
    <div className={`${bgClass} p-3 rounded-xl border border-gray-100`}>
      <Icon className={`w-5 h-5 ${colorClass}`} />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value?.toLocaleString() ?? '—'}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</p>
    </div>
  </motion.div>
);

// ── Log Entry Row ─────────────────────────────────────────────────────────────
const LogEntryRow = ({ log, expanded, onToggle, onHistory }) => {
  const meta     = resolveLogMeta(log.description, log.event);
  const Icon     = meta.icon;
  const subject  = humanizeSubject(log);
  const props    = log.properties ?? {};
  const hasProps = Object.keys(props).length > 0;
  const ipAddr   = props.ip_address ?? props.ip ?? null;
  const severity = getSeverity(log.description);
  const sev      = SEVERITY_MAP[severity];

  const subjectType = log.subject_type?.toLowerCase().includes('customer') && !log.subject_type?.toLowerCase().includes('document')
    ? 'customer'
    : log.subject_type?.toLowerCase().includes('customerdocument')
    ? 'document'
    : null;

  const getInitials = () => {
    if (!log.causer) return 'SY';
    const f = log.causer.firstname?.[0] ?? '';
    const l = log.causer.lastname?.[0]  ?? '';
    return (f + l).toUpperCase() || (log.causer.email?.[0]?.toUpperCase() ?? '?');
  };

  const getCauserName = () => {
    if (!log.causer) return 'System';
    if (log.causer.firstname) return `${log.causer.firstname} ${log.causer.lastname}`;
    return log.causer.email ?? 'Unknown';
  };

  return (
    <div className={`border-l-[3px] ${sev.border} transition-colors ${expanded ? 'bg-blue-50/30' : 'hover:bg-gray-50/80'}`}>
      <div className="flex items-start gap-3 px-5 py-4">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#05173a] to-[#1877F2] flex items-center justify-center text-white text-xs font-bold shadow-sm mt-0.5 select-none ring-2 ring-white">
          {getInitials()}
        </div>

        {/* Category icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center mt-0.5 border border-gray-100`}>
          <Icon className={`w-4.5 h-4.5 ${meta.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => hasProps && onToggle()}>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-800">{getCauserName()}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${meta.badge}`}>{meta.label}</span>
            {subject && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">{subject}</span>
            )}
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed">{humanizeDescription(log.description, log.properties)}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <MdAccessTime className="w-3 h-3" />
              {formatDateShort(log.created_at)}
            </span>
            <span className="text-[11px] text-blue-400 font-medium">{formatRelative(log.created_at)}</span>
            {ipAddr && (
              <span className="text-[11px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                {ipAddr}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          {subjectType && log.subject_id && (
            <button
              onClick={() => onHistory({
                subjectType,
                subjectId:    log.subject_id,
                subjectLabel: subject ?? log.description,
              })}
              className="p-2 rounded-lg text-[#1877F2] hover:bg-blue-50 transition-colors"
              title="View full history timeline"
            >
              <MdTimeline className="w-5 h-5" />
            </button>
          )}
          {hasProps && (
            <button
              onClick={onToggle}
              className={`p-2 rounded-lg transition-colors ${expanded ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
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
            <div className="mx-5 mb-4 p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-gray-200/80">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <MdVisibility className="w-3.5 h-3.5" />
                Event Details
              </p>
              <PropertiesPanel log={log} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const [historyTarget, setHistoryTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  const isCompliance = apiEndpoint.includes('compliance');

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
  }, [filters, activeTab, apiEndpoint]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const params = { format, category: activeTab };
      if (filters.search)    params.search    = filters.search;
      if (filters.causer_id) params.causer_id = filters.causer_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to)   params.date_to   = filters.date_to;

      const res = await api.post(`${apiEndpoint.replace('/audit-logs', '')}/audit-logs/export`, params, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const hasFiltersActive = filters.search || filters.causer_id || filters.date_from || filters.date_to;

  const activeCategory = useMemo(() => CATEGORIES.find((c) => c.key === activeTab), [activeTab]);

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#01060f] via-[#05173a] to-[#0a2a5e] px-6 py-6 shadow-xl">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #1877F2 0%, transparent 60%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                {isCompliance
                  ? <FaShieldAlt className="w-5 h-5 text-blue-400" />
                  : <MdHistory className="w-6 h-6 text-blue-400" />
                }
              </div>
              {isCompliance ? 'Compliance Audit Trail' : 'System Audit Logs'}
            </h1>
            <p className="mt-1.5 text-sm text-blue-200/80 ml-[52px]">
              {isCompliance
                ? 'BSP-compliant audit trail — full regulatory oversight of all system activity.'
                : 'A complete record of all activity in the system — who did what, and when.'
              }
            </p>
          </div>
          <div className="flex items-center gap-2 ml-[52px] sm:ml-0">
            {/* Export buttons for compliance */}
            {isCompliance && (
              <div className="flex items-center gap-1 mr-1">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  <MdDownload className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <MdDownload className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            )}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                showFilters || hasFiltersActive
                  ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-lg shadow-blue-500/20'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <MdFilterList className="w-4 h-4" />
              Filters {hasFiltersActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
            <button
              onClick={() => fetchLogs()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
            >
              <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Activities Today"        value={stats?.total_today}    icon={MdHistory}             colorClass="text-blue-600"   bgClass="bg-blue-50"   />
        <StatCard label="Successful Logins Today" value={stats?.logins_today}   icon={FaSignInAlt}           colorClass="text-emerald-600"bgClass="bg-emerald-50"/>
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <MdFilterList className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter & Search</p>
                {hasFiltersActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-600 border border-blue-200 uppercase">Active</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Search</label>
                  <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="search"
                      value={filters.search}
                      onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                      placeholder="Search descriptions, user names..."
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#1877F2] bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div className="min-w-[180px]">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Performed By</label>
                  <select
                    name="causer_id"
                    value={filters.causer_id}
                    onChange={(e) => setFilters((p) => ({ ...p, causer_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors"
                  >
                    <option value="">All Users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <FaCalendarAlt className="inline w-3 h-3 mr-1 -mt-0.5" />Date From
                  </label>
                  <input type="date" name="date_from" value={filters.date_from}
                    onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <FaCalendarAlt className="inline w-3 h-3 mr-1 -mt-0.5" />Date To
                  </label>
                  <input type="date" name="date_to" value={filters.date_to}
                    onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Per Page</label>
                  <select value={filters.per_page}
                    onChange={(e) => setFilters((p) => ({ ...p, per_page: Number(e.target.value) }))}
                    className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors">
                    {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {hasFiltersActive && (
                  <button
                    onClick={() => setFilters({ search: '', causer_id: '', date_from: '', date_to: '', per_page: 25 })}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors font-medium"
                  >
                    <MdClose className="w-4 h-4" /> Clear All
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category Tabs ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5">
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setExpandedRow(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#05173a] text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-300' : ''}`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results summary bar ─────────────────────────────────────── */}
      {!loading && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-400 font-medium">
            {pagination.total > 0
              ? `Showing ${pagination.from}–${pagination.to} of ${pagination.total.toLocaleString()} records`
              : 'No records found'
            }
            {activeTab !== 'all' && <span className="ml-1 text-gray-500">in {activeCategory?.label}</span>}
          </p>
          {hasFiltersActive && (
            <p className="text-xs text-blue-500 font-medium flex items-center gap-1">
              <MdFilterList className="w-3 h-3" /> Filters applied
            </p>
          )}
        </div>
      )}

      {/* ── Logs Feed ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="flex gap-2">
                    <div className="h-3.5 bg-gray-200 rounded-full w-28" />
                    <div className="h-3.5 bg-gray-100 rounded-full w-20" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-50 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
              <MdHistory className="w-10 h-10 opacity-30" />
            </div>
            <p className="font-semibold text-gray-500">No audit logs found</p>
            <p className="text-sm mt-1.5 text-gray-400">Try a different category tab or adjust your filters</p>
            {hasFiltersActive && (
              <button
                onClick={() => setFilters({ search: '', causer_id: '', date_from: '', date_to: '', per_page: 25 })}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <MdClose className="w-4 h-4" /> Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100/70">
            {logs.map((log) => (
              <LogEntryRow
                key={log.id}
                log={log}
                expanded={expandedRow === log.id}
                onToggle={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                onHistory={setHistoryTarget}
              />
            ))}
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
            apiEndpoint={apiEndpoint}
            onClose={() => setHistoryTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogs;
