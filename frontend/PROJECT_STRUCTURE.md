# SigCard Frontend Project Structure

This document outlines the organized folder structure for the SigCard multi-role application built with React + Vite.

## 📁 Project Structure

```
src/
├── 📁 assets/                    # Static assets
│   ├── 📁 images/                # Images, logos, illustrations
│   ├── 📁 icons/                 # Icon files (SVG, PNG)
│   ├── 📁 fonts/                 # Custom fonts
│   └── 📁 videos/                # Video assets
│
├── 📁 components/                # Reusable UI components
│   ├── 📁 common/                # Common shared components
│   │   ├── Button.jsx            # Reusable button component
│   │   ├── Modal.jsx             # Modal component
│   │   ├── Loading.jsx           # Loading spinner/skeleton
│   │   └── ErrorBoundary.jsx     # Error boundary wrapper
│   │
│   ├── 📁 ui/                    # Basic UI building blocks
│   │   ├── Input.jsx             # Form input component
│   │   ├── Select.jsx            # Dropdown select component
│   │   ├── Card.jsx              # Card container component
│   │   ├── Table.jsx             # Data table component
│   │   └── Pagination.jsx        # Pagination component
│   │
│   ├── 📁 layout/                # Layout components
│   │   ├── AuthLayout.jsx        # Layout for authentication pages
│   │   ├── AppLayout.jsx         # Main application layout
│   │   ├── Header.jsx            # Application header
│   │   ├── Sidebar.jsx           # Navigation sidebar
│   │   └── Footer.jsx            # Application footer
│   │
│   ├── 📁 forms/                 # Form-specific components
│   │   ├── LoginForm.jsx         # Login form
│   │   ├── UserForm.jsx          # User creation/edit form
│   │   └── ComplianceForm.jsx    # Compliance audit form
│   │
│   ├── 📁 charts/                # Chart/visualization components
│   │   ├── BarChart.jsx          # Bar chart component
│   │   ├── LineChart.jsx         # Line chart component
│   │   └── PieChart.jsx          # Pie chart component
│   │
│   ├── 📁 features/              # Feature-specific components
│   │   ├── UserManagement/       # User management feature
│   │   ├── ComplianceAudit/      # Compliance audit feature
│   │   └── Dashboard/            # Dashboard feature
│   │
│   └── index.js                  # Component exports
│
├── 📁 pages/                     # Page components (route destinations)
│   ├── 📁 admin/                 # Admin role pages
│   │   ├── Dashboard.jsx         # Admin dashboard
│   │   ├── UserManagement.jsx    # User management page
│   │   ├── SystemSettings.jsx    # System configuration
│   │   └── Reports.jsx           # Admin reports
│   │
│   ├── 📁 compliance-audit/      # Compliance Auditor pages
│   │   ├── Dashboard.jsx         # Compliance dashboard
│   │   ├── AuditManagement.jsx   # Audit management
│   │   ├── Reports.jsx           # Compliance reports
│   │   └── RiskAssessment.jsx    # Risk assessment tools
│   │
│   ├── 📁 user/                  # Regular User pages
│   │   ├── Dashboard.jsx         # User dashboard
│   │   ├── Profile.jsx           # User profile
│   │   └── Settings.jsx          # User settings
│   │
│   ├── 📁 manager/               # Manager role pages
│   │   ├── Dashboard.jsx         # Manager dashboard
│   │   ├── TeamManagement.jsx    # Team management
│   │   ├── Reports.jsx           # Manager reports
│   │   └── Performance.jsx       # Performance tracking
│   │
│   ├── 📁 shared/                # Shared pages across roles
│   │   ├── Login.jsx             # Login page
│   │   ├── ForgotPassword.jsx    # Password reset
│   │   ├── NotFound.jsx          # 404 error page
│   │   └── Unauthorized.jsx      # 403 error page
│   │
│   └── index.js                  # Page exports
│
├── 📁 hooks/                     # Custom React hooks
│   ├── useAuth.js                # Authentication hook
│   ├── useLocalStorage.js        # Local storage hook
│   ├── useDebounce.js            # Debounce hook
│   └── usePermissions.js         # Role/permissions hook
│
├── 📁 services/                  # API and external services
│   ├── api.js                    # Axios configuration
│   ├── authService.js            # Authentication API calls
│   ├── userService.js            # User management API
│   ├── complianceService.js      # Compliance audit API
│   └── reportService.js          # Reports API
│
├── 📁 context/                   # React Context providers
│   ├── AuthContext.jsx           # Authentication context
│   ├── ThemeContext.jsx          # Theme/UI context
│   └── NotificationContext.jsx   # Global notifications
│
├── 📁 utils/                     # Utility functions
│   ├── helpers.js                # General helper functions
│   ├── formatters.js             # Data formatting utilities
│   ├── validators.js             # Form validation functions
│   └── dateUtils.js              # Date manipulation utilities
│
├── 📁 constants/                 # Application constants
│   ├── roles.js                  # User roles and permissions
│   ├── routes.js                 # Route constants
│   ├── apiEndpoints.js           # API endpoint constants
│   └── appConfig.js              # App configuration
│
├── 📁 types/                     # TypeScript type definitions
│   ├── auth.js                   # Authentication types
│   ├── user.js                   # User-related types
│   └── api.js                    # API response types
│
├── App.jsx                       # Main App component
├── main.jsx                      # Application entry point
└── index.css                     # Global styles
```

## 🎯 Key Design Principles

### 1. **Role-Based Organization**
- Pages are organized by user roles (admin, manager, compliance-audit, user)
- Each role has its own dedicated folder with relevant pages
- Shared components and pages are in separate folders

### 2. **Component Reusability**
- Components are categorized by their purpose (common, ui, layout, forms)
- Each component is designed to be highly reusable with flexible props
- Components include proper prop validation and documentation

### 3. **Feature-Driven Structure**
- Complex features have their own folders under `components/features/`
- Related components, hooks, and utilities are grouped together
- Promotes maintainability and team collaboration

### 4. **Separation of Concerns**
- **Pages**: Route destinations and page-level logic
- **Components**: Reusable UI elements
- **Services**: API calls and external integrations
- **Hooks**: Custom React logic
- **Utils**: Pure utility functions
- **Constants**: Static configuration data

## 🚀 Usage Guidelines

### Adding New Components
1. Determine the component's category (common, ui, layout, forms, features)
2. Create the component in the appropriate folder
3. Export it from the folder's `index.js` file
4. Follow the established naming conventions

### Creating New Pages
1. Identify the target user role
2. Create the page in the appropriate role folder
3. Use the correct layout component (AuthLayout or AppLayout)
4. Export from `pages/index.js`

### API Integration
1. Add service functions in the appropriate service file
2. Use the configured axios instance from `services/api.js`
3. Handle errors consistently across the application

### State Management
1. Use React Context for global state
2. Use custom hooks for component-level state logic
3. Keep state as close to where it's needed as possible

## 🔧 Configuration

### Environment Variables
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_NODE_ENV`: Environment (development/production)

### Asset Organization
- **Images**: Product images, user avatars, illustrations
- **Icons**: UI icons, brand icons, status indicators
- **Fonts**: Custom typography files
- **Videos**: Tutorial videos, promotional content

## 📝 Best Practices

1. **Naming Conventions**
   - Use PascalCase for components
   - Use camelCase for functions and variables
   - Use kebab-case for file names when needed

2. **Component Design**
   - Write components as pure functions when possible
   - Use proper prop types and default values
   - Include proper error handling

3. **Code Organization**
   - Keep files small and focused
   - Group related functionality together
   - Use absolute imports with path aliases

4. **Performance**
   - Lazy load pages and large components
   - Optimize images and assets
   - Use React.memo for expensive components

This structure supports a scalable, maintainable codebase that can grow with your application's needs while keeping code organized and easy to navigate for development teams.