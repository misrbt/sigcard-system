# Dashboard Components

Beautiful, reusable dashboard components built with React, Tailwind CSS, and Framer Motion.

## Components Overview

### 1. StatCard

Displays key statistics with icons, trends, and animations.

**Props:**
- `title` (string) - The title of the stat
- `value` (string|number) - The main value to display
- `icon` (ReactNode) - Icon component to display
- `trend` (string) - Trend indicator (e.g., "+12%")
- `trendUp` (boolean) - Whether trend is positive (default: true)
- `bgColor` (string) - Background color class (default: "bg-blue-500")
- `iconColor` (string) - Icon color class (default: "text-blue-500")
- `subtitle` (string) - Additional subtitle text

**Example:**
```jsx
<StatCard
  title="Total Users"
  value="1,248"
  icon={<FaUsers />}
  trend="+12.5%"
  trendUp={true}
  bgColor="bg-blue-500"
  iconColor="text-blue-500"
  subtitle="Active users"
/>
```

### 2. QuickActions

Grid of quick action buttons for common administrative tasks.

**Props:**
- `actions` (array) - Array of action objects

**Action Object Structure:**
```javascript
{
  icon: <IconComponent />,
  label: "Action Label",
  color: "blue", // blue, green, purple, orange, red, indigo
  onClick: () => {}
}
```

**Example:**
```jsx
<QuickActions
  actions={[
    {
      icon: <FaUserPlus />,
      label: "Add User",
      color: "blue",
      onClick: handleAddUser
    }
  ]}
/>
```

### 3. RecentActivity

Displays recent system activities with timestamps and user information.

**Props:**
- `activities` (array) - Array of activity objects
- `maxItems` (number) - Maximum items to display (default: 5)

**Activity Object Structure:**
```javascript
{
  icon: <IconComponent />,
  title: "Activity Title",
  description: "Activity description",
  time: "5 minutes ago",
  user: "Username",
  type: "success", // success, warning, error, info, default
  badge: "Optional badge text"
}
```

**Example:**
```jsx
<RecentActivity
  activities={activities}
  maxItems={5}
/>
```

### 4. SystemHealth

Displays system health metrics with progress bars and status indicators.

**Props:**
- `metrics` (array) - Array of metric objects
- `overallStatus` (string) - Overall system status: "operational", "warning", "critical"

**Metric Object Structure:**
```javascript
{
  label: "CPU Usage",
  value: 45,
  maxValue: 100,
  status: "good" // excellent, good, warning, critical
}
```

**Example:**
```jsx
<SystemHealth
  metrics={[
    {
      label: "CPU Usage",
      value: 45,
      maxValue: 100,
      status: "good"
    }
  ]}
  overallStatus="operational"
/>
```

## Design Principles

### 1. **Consistency**
- Unified color scheme across components
- Consistent spacing and padding
- Standard border radius and shadows

### 2. **Responsiveness**
- Mobile-first approach
- Responsive grid layouts
- Touch-friendly interactive elements

### 3. **Accessibility**
- Semantic HTML elements
- Proper color contrast ratios
- Keyboard navigation support

### 4. **Performance**
- Optimized animations with Framer Motion
- Lazy loading where applicable
- Minimal re-renders

### 5. **Maintainability**
- Clear component structure
- Well-documented props
- Reusable and composable

## Styling Guidelines

### Color Palette
- **Blue**: Primary actions, information
- **Green**: Success, positive trends
- **Red**: Errors, negative trends
- **Orange**: Warnings, pending items
- **Purple**: Special features
- **Gray**: Neutral, backgrounds

### Typography
- **Headings**: Bold, clear hierarchy
- **Body**: Readable font sizes (14px-16px)
- **Labels**: Medium weight, smaller size

### Spacing
- **Padding**: Consistent 24px (p-6) for cards
- **Gaps**: 24px between major sections
- **Margins**: 16px between related elements

## Usage in Dashboard

```jsx
import {
  StatCard,
  QuickActions,
  RecentActivity,
  SystemHealth
} from '../../components/dashboard';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard {...statProps} />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={actions} />

      {/* Activity and Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} />
        </div>
        <SystemHealth metrics={metrics} />
      </div>
    </div>
  );
};
```

## Customization

All components accept standard React props and can be customized with:
- **className**: Additional Tailwind classes
- **style**: Inline styles
- **...props**: Any other HTML attributes

## Animation

Components use Framer Motion for smooth animations:
- **Fade in**: Initial load animations
- **Hover effects**: Interactive feedback
- **Stagger**: Sequential animations for lists

## Future Enhancements

- [ ] Dark mode support
- [ ] Export to PDF functionality
- [ ] Advanced filtering options
- [ ] Real-time updates with WebSocket
- [ ] Customizable layouts
- [ ] Internationalization (i18n)
