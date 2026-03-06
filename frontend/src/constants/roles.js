export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  COMPLIANCE_AUDIT: 'compliance-audit',
  USER: 'user',
  CASHIER: 'cashier',
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.COMPLIANCE_AUDIT]: 'Compliance Auditor',
  [USER_ROLES.USER]: 'User',
  [USER_ROLES.CASHIER]: 'Cashier',
};

export const HOME_PATHS = {
  admin:              '/admin/dashboard',
  manager:            '/manager/dashboard',
  user:               '/user/dashboard',
  cashier:            '/cashier/dashboard',
  'compliance-audit': '/compliance/dashboard',
};

export const LAYOUT_TYPES = {
  admin:             'sidebar',
  'compliance-audit': 'topnav',
  manager:           'topnav',
  cashier:           'topnav',
  user:              'usernav',
};

// Ordered by priority — first match wins in getPrimaryRole()
export const ROLE_PRIORITY = [
  'admin',
  'manager',
  'compliance-audit',
  'user',
  'cashier',
];
