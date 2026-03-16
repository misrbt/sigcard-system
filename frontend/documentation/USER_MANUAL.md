# SigCard System — User Manual

**Rural Bank of Talisayan, Inc. (RBT Bank)**
**BSP-Compliant Signature Card Management System**

**Version:** 1.0
**Date:** March 16, 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
   - 2.1 [Logging In](#21-logging-in)
   - 2.2 [First-Time Login (Temporary Password)](#22-first-time-login-temporary-password)
   - 2.3 [Two-Factor Authentication (2FA)](#23-two-factor-authentication-2fa)
   - 2.4 [Session Timeout & Auto-Logout](#24-session-timeout--auto-logout)
   - 2.5 [Viewing Your Profile](#25-viewing-your-profile)
   - 2.6 [Logging Out](#26-logging-out)
3. [User Role Guide](#3-user-role-guide)
   - 3.1 [Home Page](#31-home-page)
   - 3.2 [Uploading a New Customer Signature Card](#32-uploading-a-new-customer-signature-card)
   - 3.3 [Viewing Customer Profiles](#33-viewing-customer-profiles)
   - 3.4 [Editing Customer Documents](#34-editing-customer-documents)
   - 3.5 [Adding an Account to an Existing Customer](#35-adding-an-account-to-an-existing-customer)
4. [Cashier Role Guide](#4-cashier-role-guide)
   - 4.1 [Branch Dashboard](#41-branch-dashboard)
   - 4.2 [Viewing Branch Customers](#42-viewing-branch-customers)
   - 4.3 [Searching Branch Documents](#43-searching-branch-documents)
5. [Manager Role Guide](#5-manager-role-guide)
   - 5.1 [Branch Dashboard](#51-branch-dashboard)
   - 5.2 [Viewing Customers](#52-viewing-customers)
   - 5.3 [Searching Documents](#53-searching-documents)
6. [Compliance-Audit Role Guide](#6-compliance-audit-role-guide)
   - 6.1 [Compliance Dashboard](#61-compliance-dashboard)
   - 6.2 [Audit Logs](#62-audit-logs)
   - 6.3 [Customer Profiles](#63-customer-profiles)
7. [Administrator Role Guide](#7-administrator-role-guide)
   - 7.1 [Admin Dashboard](#71-admin-dashboard)
   - 7.2 [User Management](#72-user-management)
   - 7.3 [Roles & Permissions](#73-roles--permissions)
   - 7.4 [Audit Logs](#74-audit-logs)
   - 7.5 [Customer Profiles](#75-customer-profiles)
   - 7.6 [Branch Management](#76-branch-management)
   - 7.7 [Data Management (Branch Hierarchy)](#77-data-management-branch-hierarchy)
   - 7.8 [System Settings](#78-system-settings)
8. [Account Types Explained](#8-account-types-explained)
9. [Customer Status Definitions](#9-customer-status-definitions)
10. [Risk Level Classifications](#10-risk-level-classifications)
11. [Data Access Scope by Role](#11-data-access-scope-by-role)
12. [Frequently Asked Questions (FAQ)](#12-frequently-asked-questions-faq)

---

## 1. Introduction

The **SigCard System** is the signature card management system of RBT Bank Inc. It is designed to digitize, organize, and secure the management of customer signature cards and supporting documents across all branches.

The system is built in compliance with **Bangko Sentral ng Pilipinas (BSP)** regulations, including:

- Full audit trail of all user actions
- Role-based access control (only authorized staff can access specific features)
- Session security with automatic logout after inactivity
- Password expiry policies
- Account lockout after failed login attempts

**Five system roles** control what each staff member can do:

| Role | Description |
|------|-------------|
| **User** | Branch staff who upload and manage customer signature cards |
| **Cashier** | Branch cashier who can view customer records and documents (read-only) |
| **Manager** | Branch manager who oversees branch customer data and reports |
| **Compliance-Audit** | Compliance officer who monitors all activity across all branches |
| **Administrator** | System administrator with full access to all features and settings |

---

## 2. Getting Started

### 2.1 Logging In

1. Open the SigCard System in your web browser.
2. You will see the **Login** page.
3. Enter your **Email Address** and **Password**.
4. (Optional) Check **Remember Me** to stay signed in on this device.
5. Click **Sign In**.
6. The system will redirect you to your role's dashboard automatically.

> **Note:** If you enter the wrong password multiple times, your account may be temporarily locked. Contact your administrator to unlock it.

---

### 2.2 First-Time Login (Temporary Password)

If you are a new user or your password has been reset by an administrator:

1. Log in with your email and the **temporary password** provided to you.
2. The system will automatically prompt you to **change your password**.
3. Enter your **current (temporary) password**.
4. Enter your **new password** and confirm it.
5. Click **Change Password**.
6. You will be redirected to your dashboard.

> **Password Requirements:** Your new password must meet the bank's security policy (minimum length, complexity). Follow the on-screen instructions.

---

### 2.3 Two-Factor Authentication (2FA)

If Two-Factor Authentication is enabled for your account:

1. After entering your email and password, you will be asked for a **verification code**.
2. Open your authenticator app (e.g., Google Authenticator) on your phone.
3. Enter the 6-digit code shown in the app.
4. Click **Verify**.

> **Tip:** If you lose access to your authenticator app, contact your administrator for recovery codes.

---

### 2.4 Session Timeout & Auto-Logout

For security, the system will **automatically log you out** after a period of inactivity (default: 30 minutes). This is a BSP compliance requirement.

- If you are logged out due to inactivity, you will see the message: *"Your session has expired due to inactivity. Please sign in again."*
- Simply log in again to continue your work.
- Your authentication token is also refreshed automatically in the background — you do not need to do anything for this.

---

### 2.5 Viewing Your Profile

Every role has access to a **Profile** page where you can view your account information.

**To access your profile:**
1. Click on your **name or avatar** in the top-right corner of any page.
2. Select **Profile** from the dropdown menu.

**Your profile shows:**
- Full name, username, and email
- Assigned role and branch
- Last login date/time and IP address
- Password expiry date
- Two-Factor Authentication status (Enabled or Disabled)

> **Note:** Profile information is read-only. Contact your administrator if any information needs to be updated.

---

### 2.6 Logging Out

1. Click on your **name or avatar** in the top-right corner.
2. Click **Logout**.
3. You will be returned to the Login page.

> **Important:** Always log out when you are done using the system, especially on shared computers.

---

## 3. User Role Guide

The **User** role is for branch staff responsible for uploading and managing customer signature cards and documents.

**Navigation Menu:**
- Home
- Upload
- Customer Profiles

---

### 3.1 Home Page

The Home page is your welcome screen with two quick actions:

- **Upload** — Start uploading a new customer's signature card
- **View Customer Profiles** — Browse existing customer records

---

### 3.2 Uploading a New Customer Signature Card

This is the main workflow for adding a new customer to the system. It uses a step-by-step wizard.

#### Step 1: Select Account Type

Choose the type of account:
- **Regular** — A single person with one account
- **Joint** — Two or more people sharing an account
- **Corporate** — A business/company account

Click **Next** to proceed.

#### Step 2: Joint Account Sub-Type (Joint accounts only)

If you selected **Joint**, choose the sub-type:
- **ITF (In Trust For)** — One primary account holder with a beneficiary. Each person uploads their own documents.
- **Non-ITF** — Multiple account holders, each person may have their own separate accounts.

#### Step 3: Customer Information

Fill in the customer details:
- **First Name** and **Last Name** (required)
- **Company Name** (for Corporate accounts only)

For Joint and Corporate accounts:
- Click **Add Person** to add additional account holders/signers.
- Fill in each person's first and last name.

#### Step 4: Account Details

Enter the account information:
- **Risk Level** — Select Low, Medium, or High (for AML compliance)
- **Account Number** — Enter the account number
- **Date Opened** — Select the account opening date
- **Status** — Select the account status (Active, Dormant, Reactivated, Escheat, or Closed)

For Regular and Non-ITF accounts:
- Click **Add Account** if the customer has multiple accounts.

#### Step 5: Signature Card Upload

Upload the customer's signature card:
- **Front Side** — Click the upload area or drag and drop the image
- **Back Side** — Click the upload area or drag and drop the image

Both front and back are **required**.

> **Accepted formats:** JPG, PNG (max 10MB per image). Images are automatically compressed for storage.

#### Step 6: NAIS Form (Optional)

Upload the NAIS (New Account Information Sheet) form:
- Front and back sides
- This step is **optional** — click **Skip** if not applicable.

#### Step 7: Data Privacy Form

Upload the Data Privacy Consent form:
- **Front Side** (required)
- **Back Side** (required)

#### Step 8: Other Documents (Optional)

Upload any additional supporting documents:
- Click **Add File** to upload multiple documents
- This step is **optional**.

#### Submitting

1. After completing all steps, click **Submit**.
2. The system will compress and upload all images (a progress bar will show the upload status).
3. On success, you will see a confirmation message and be redirected to the customer's profile.

---

### 3.3 Viewing Customer Profiles

Navigate to **Customer Profiles** from your menu.

#### Table View (Default)

The table shows all customers you have access to with:
- Customer name and ID
- Account type (Regular, Joint, Corporate)
- Account number(s)
- Status (Active, Dormant, Escheat, Closed)
- Risk level
- Branch
- Date created

**Filtering & Searching:**
- Use the **Search** bar to find customers by name, account number, or branch
- Use dropdown filters for **Account Type**, **Status**, **Risk Level**, and **Branch**
- Click column headers to sort ascending/descending

**Pagination:**
- Navigate between pages using the Previous/Next buttons
- Change how many rows are shown per page (10, 15, 25, 50, 100)

#### Quick Search View

Switch to the **Quick Search** tab for faster lookup:
1. Start typing a customer's name or account number
2. Results appear instantly in a dropdown
3. Click a result to view the customer's full details below

#### Viewing Customer Details

Click **View** on any customer row to open the detail panel:

- **Profile Section** — Name, email, phone, account type, status, risk level, branch
- **Accounts Section** — For customers with multiple accounts, use tabs to switch between accounts
- **Documents Section** — View all uploaded documents organized by type:
  - Signature Card (Front/Back)
  - NAIS Form (Front/Back)
  - Data Privacy (Front/Back)
  - Other Documents
- Click any document thumbnail to open the **full-screen image viewer** with zoom and navigation controls

**Image Viewer Controls:**
- Use **+/-** buttons or mouse scroll to zoom in/out
- Click and drag to pan when zoomed in
- Use arrow keys or on-screen buttons to navigate between documents
- Press **Esc** or click **X** to close

#### Row Actions

From the customer table, you can:
- **View** — Open the customer detail panel
- **Edit Docs** — Go to the document editing page
- **Add Account** — Add a new account to this customer (non-Joint customers only)

---

### 3.4 Editing Customer Documents

To update or replace a customer's documents:

1. From the Customer Profiles table, click **Edit Docs** on the customer row.
2. You will see tabs for each document type: **Sigcard**, **NAIS**, **Data Privacy**, **Other Docs**.
3. Select the tab for the document you want to update.
4. For Joint accounts, select the **Person** whose documents you want to edit.
5. Click on the image area to upload a new file (this replaces the existing document).
6. A **"Ready"** indicator appears next to pending uploads.
7. Click **Save** to upload all pending changes.
8. A **"Saved"** indicator confirms the upload was successful.

> **Important:** When you replace a document, the old version is archived automatically. The change is recorded in the audit log for compliance purposes.

---

### 3.5 Adding an Account to an Existing Customer

For customers with Regular or Non-ITF Joint accounts, you can add additional accounts:

1. From the Customer Profiles table, click **Add Account** on the customer row.
2. Follow the wizard steps:
   - **Step 1:** Enter account details (risk level, status, account number, date opened)
   - **Step 2:** Upload signature card (front and back)
   - **Step 3:** Upload NAIS form (optional)
   - **Step 4:** Upload Data Privacy form
   - **Step 5:** Upload other documents (optional)
3. Click **Submit** to save the new account.

---

## 4. Cashier Role Guide

The **Cashier** role provides **read-only access** to customer records within your assigned branch. You can view customer information and documents but cannot upload, edit, or delete records.

**Navigation Menu:**
- Dashboard
- Customers
- Documents

---

### 4.1 Branch Dashboard

Your dashboard shows an overview of your branch's data:

**Summary Cards:**
- Total Customers in your branch
- Total Documents uploaded
- Today's Uploads
- Branch Users (staff count)
- Active Customers

**Status Breakdown:**
- Four cards showing Active, Dormant, Escheat, and Closed counts with percentage bars

**Charts:**
- **Account Types** — Bar chart showing Regular, Joint, Corporate distribution
- **Risk Levels** — Bar chart showing Low, Medium, High Risk distribution
- **Monthly Uploads** — Bar chart showing the last 6 months of activity

Click on any stat card to navigate to the customer list.

---

### 4.2 Viewing Branch Customers

Navigate to **Customers** to see a table of all customers in your branch.

- Use the **Search** bar to find customers by name, account number, or branch
- Use dropdown filters for Account Type, Status, Risk Level
- Click **View** to open the customer detail panel with all their documents
- Click document thumbnails to view full-size images

> **Note:** As a Cashier, you can view but cannot edit or upload documents.

---

### 4.3 Searching Branch Documents

Navigate to **Documents** for a quick document lookup:

1. Type a customer's name or ID in the search bar
2. Select the customer from the dropdown results
3. All their documents will be displayed below, organized by type:
   - Signature Card (Front/Back)
   - NAIS Form (Front/Back)
   - Data Privacy (Front/Back)
   - Other Documents
4. Click any image to open it in the full-screen viewer with zoom
5. Click **New Search** to look up a different customer

---

## 5. Manager Role Guide

The **Manager** role provides oversight of your branch and its Branch Lite Units (BLUs). You can view customer records and branch statistics but cannot upload new customers.

**Navigation Menu:**
- Dashboard
- Customers
- Documents

---

### 5.1 Branch Dashboard

Your dashboard provides the same features as the Cashier dashboard, with additional visibility:

- **Branch Summary Table** — If your branch has child branches (BLUs), you will see a table showing statistics for each BLU under your branch
- Your main branch is highlighted at the top of the table
- Statistics include: Total customers, Active, Dormant, Escheat, Closed, and Today's uploads per branch

All other features (stat cards, status breakdown, charts) are the same as described in the [Cashier Dashboard](#41-branch-dashboard) section.

---

### 5.2 Viewing Customers

Same as [Cashier — Viewing Branch Customers](#42-viewing-branch-customers). You can view all customers in your branch and any child BLU branches.

---

### 5.3 Searching Documents

Same as [Cashier — Searching Branch Documents](#43-searching-branch-documents). You can search for documents across your branch and child BLUs.

---

## 6. Compliance-Audit Role Guide

The **Compliance-Audit** role is for compliance officers who need to monitor and audit all system activity across **all branches**. This is a **read-only oversight** role — you can view everything but cannot modify data.

**Navigation Menu:**
- Dashboard
- Audit Logs
- Customer Profiles

---

### 6.1 Compliance Dashboard

Your dashboard shows a bank-wide overview of all branches:

**Top-Level Statistics (4 cards):**
- Total Customers (with active count)
- SigCard Uploads (total signature cards)
- Total Documents (all uploaded files)
- System Users (staff accounts)

**Customer Status Breakdown:**
- Active, Dormant, Escheat, and Closed counts with percentage progress bars

**Charts & Analytics:**
- **Customers by Branch** — Stacked bar chart showing status breakdown per branch
- **Status Distribution** — Pie chart of overall status proportions
- **Monthly Customer Uploads** — Line chart showing the 6-month trend
- **SigCard Uploads by Branch** — Bar chart showing per-branch signature card counts
- **Account Types** — Pie chart (Individual, Joint, Corporate)
- **Risk Level Distribution** — Low, Medium, High Risk with progress bars

**Data Tables:**
- **Branch Breakdown Table** — All branches with status counts (Total, Active, Dormant, Escheat, Closed)
- **Recent Customer Uploads** — Latest 8 customer records with branch, type, status, uploader, and date

Click **Refresh** to reload the latest data.

---

### 6.2 Audit Logs

The Audit Logs page is your primary tool for BSP compliance monitoring. It shows a complete record of **every action** performed in the system.

**Category Tabs:**
Filter logs by category using the tabs at the top:
- **All Activity** — Every event in the system
- **Login Activity** — User logins, logouts, and failed attempts
- **Customer Records** — Customer creation, updates, document changes, status changes
- **Staff Accounts** — User account creation, edits, role changes, password resets
- **Security** — Security-related events (lockouts, 2FA changes)
- **System** — System settings changes, maintenance events

**Advanced Filters:**
Click the filter panel to narrow results by:
- **Event Type** — Specific action type (created, updated, deleted, etc.)
- **Date Range** — From and To date
- **User** — Which staff member performed the action
- Click **Apply** to filter or **Reset** to clear filters

**Reading Log Entries:**

Each log entry shows:
- **Timestamp** — When the action occurred (hover for exact date/time)
- **User** — Who performed the action (shown with avatar)
- **Subject** — What was affected (e.g., "Customer Juan Dela Cruz")
- **Event** — What happened (created, updated, deleted, etc.)
- **Changes** — A quick summary of what changed

**Viewing Detailed Changes:**

Click any log entry to expand it and see:
- Complete list of changed fields with before and after values
- **Document Comparisons** — When a document was replaced, see the old (archived) image side-by-side with the new (current) image
- **Status Changes** — When a customer's status changed, see the old and new status with color-coded badges
- **Document Gallery** — When a customer was first created, see all documents that were uploaded

**Viewing Full History:**

Click a log entry to open the **History Modal**, which shows the complete timeline of all changes for that customer or user, from creation to the present.

---

### 6.3 Customer Profiles

Navigate to **Customer Profiles** to view all customer records across all branches.

- Search, filter, and view customers the same way as described in [Viewing Customer Profiles](#33-viewing-customer-profiles)
- You have access to all branches (no branch restriction)
- View all customer documents, accounts, and details
- This is a read-only view — you cannot edit or upload

---

## 7. Administrator Role Guide

The **Administrator** role has full access to all system features. You manage users, roles, branches, system settings, and can view all customer data and audit logs.

**Sidebar Navigation:**
- Dashboard
- Users
- Roles & Permissions
- Audit Logs
- Customer Profiles
- Branches
- Data Management
- Settings

---

### 7.1 Admin Dashboard

Your dashboard provides a comprehensive bank-wide overview.

#### Bank-Wide Overview

Six key metric cards at the top:
- **Total Customers** — Click to go to Customer Profiles
- **SigCard Uploads** — Click to go to Customer Profiles
- **Total Documents** — Click to go to Customer Profiles
- **System Users** — Click to go to User Management
- **Branches** — Total branch count (excluding Head Office)
- **Today Uploads** — Customers added today

#### Customer Status Summary

Four status cards showing:
- **Active** — Count and percentage (green)
- **Dormant** — Count and percentage (yellow)
- **Escheat** — Count and percentage (orange)
- **Closed** — Count and percentage (red)

Click any status card to view filtered customers.

#### Charts

- **Customers by Branch** — Stacked bar chart showing status breakdown per branch
- **Status Distribution** — Pie chart of overall status
- **Monthly Customer Uploads** — Line chart of the last 6 months
- **Account Types** — Pie chart (Individual, Joint, Corporate)
- **Risk Level Distribution** — Low/Medium/High Risk with progress bars

#### Branch Summary Cards

Clickable cards for each branch (excluding Head Office) showing:
- Branch name and code
- Total customer count and active percentage
- Visual status bar (color segments)
- Quick stats: SigCards, Documents, Staff count

**Click any branch card** to open the **Branch Detail Panel** showing:
- Status breakdown with progress bars
- Account type breakdown
- Risk level analysis
- Document and staff statistics
- Branch hierarchy information

#### Branch Breakdown Table

Full table with all branches and their statistics. Click any row to view branch details.

#### Recent Customer Uploads

Table of the 10 most recently added customers with name, branch, type, status, uploader, and date. Click any row to view the customer's profile.

---

### 7.2 User Management

Navigate to **Users** to manage all system user accounts.

#### Viewing Users

The page shows a table of all users with:
- Name and username
- Email
- Role (color-coded badge)
- Branch assignment
- Status (Active, Inactive, Suspended, Locked)
- Join date and last login

**Statistics bar** at the top shows: Total Users, Active, Inactive/Suspended, Locked counts.

**Search and Filter:**
- Search by name, email, or username
- Filter by Status, Role, or Branch
- Click **Reset** to clear all filters
- Click column headers to sort

#### Creating a New User

1. Click **Add User** in the top-right corner.
2. Fill in the form:
   - **First Name** and **Last Name** (required)
   - **Username** (required, must be unique)
   - **Email** (required, must be unique)
   - **Branch** (required, select from dropdown)
   - **Status** (Active, Inactive, or Suspended)
   - **Account Expires At** (optional date)
   - **Role** (required, select one role)
   - **Enable Two-Factor Authentication** (toggle on/off)
3. Click **Create User**.
4. The new user will receive a temporary password from the administrator.

#### Editing a User

1. Click the **Edit** (pencil) icon on the user's row.
2. Modify any fields as needed.
3. To change the password, enter a new password in the password field (leave blank to keep the current password).
4. Click **Update User**.

#### Other User Actions

- **Reset Password** (lock icon) — Generates a new temporary password for the user
- **Activate/Deactivate** (toggle icon) — Enable or disable a user account
- **Unlock** (unlock icon, only shown if locked) — Unlock an account that was locked due to too many failed login attempts
- **Delete** (trash icon) — Permanently remove a user account (confirmation required)

#### Exporting User List

Click **Export CSV** to download a spreadsheet of all users with their details.

---

### 7.3 Roles & Permissions

Navigate to **Roles & Permissions** to configure what each role can do.

#### Permission Matrix

The page shows a grid/matrix:
- **Rows** = Individual permissions (grouped by category)
- **Columns** = Roles (Admin, Manager, Compliance-Audit, Cashier, User)

**Permission Categories:**
1. User Management — Control who can view, create, edit, delete users
2. Role Management — Control who can manage roles and permissions
3. Transactions — Control transaction access
4. Financial Operations — Control account and balance access
5. Compliance & Audit — Control audit log and compliance report access
6. System Admin — Control system settings and backup access
7. Customer Management — Control customer record access
8. Reporting — Control report generation access
9. Authentication — Control password reset and session management access
10. Branch Operations — Control branch data and operation access

#### Editing Permissions

1. Find the permission you want to change.
2. Check or uncheck the box for the role you want to grant or revoke it for.
3. A blue banner will appear: *"You have unsaved changes."*
4. Click **Save Changes** to apply.

> **Note:** Admin role permissions are always fully enabled and cannot be changed.

---

### 7.4 Audit Logs

The Admin Audit Logs page works the same as the [Compliance Audit Logs](#62-audit-logs) — see that section for full details.

Key features:
- Six category tabs (All Activity, Login Activity, Customer Records, Staff Accounts, Security, System)
- Advanced filters (event type, date range, user)
- Expandable log entries with full change details
- Document before/after image comparison
- Status change visualization
- Full subject history modal

---

### 7.5 Customer Profiles

Navigate to **Customer Profiles** to view and manage all customer records across all branches.

Features are the same as described in [Viewing Customer Profiles](#33-viewing-customer-profiles), with full access to:
- Table view and Quick Search view
- Customer detail panels with all documents
- Edit customer information
- Change customer status
- Add accounts
- Edit documents
- Delete customers (with confirmation)

---

### 7.6 Branch Management

Navigate to **Branches** to manage the bank's branch structure.

#### Summary Cards

Four cards at the top show:
- **Total Branches** — All branches in the system
- **Mother Branches** — Main/parent branches
- **Total Employees** — All staff across all branches
- **Total Customers** — All customers across all branches

#### Two View Modes

Toggle between views using the buttons:

**Hierarchy View (Default):**
Shows branches organized by parent-child relationship. Each mother branch appears as an expandable card.

Click a mother branch to expand and see:
- **Employees Table** — All staff assigned to this branch with:
  - Full name, username, email
  - Role (color-coded badge)
  - Data Access Scope (what data they can see — see [Section 11](#11-data-access-scope-by-role))
  - Status (Active/Inactive/Suspended)
- **Branch Lite Units** — Cards for each child BLU showing:
  - BLU name and code
  - Employee count and customer count
  - List of employees with their roles and access scopes

**List View:**
A simple table showing all branches with:
- Branch Name, Abbreviation (BRAK), Code
- Type (Mother Branch or BLU)
- Parent branch name (if it is a BLU)
- Employee count, Customer count
- Edit and Delete actions

#### Creating a New Branch

1. Click **Add Branch** in the top-right corner.
2. Fill in the form:
   - **Branch Name** (required, must be unique)
   - **Abbreviation (BRAK)** (required, must be unique)
   - **Branch Code** (required, must be unique)
3. Click **Create Branch**.

#### Editing a Branch

1. Click the **Edit** (pencil) icon on the branch.
2. Modify any fields.
3. You can optionally assign a **Parent Branch** to make this branch a BLU under a mother branch.
4. Click **Update Branch**.

#### Deleting a Branch

1. Click the **Delete** (trash) icon on the branch.
2. Confirm the deletion in the dialog.

> **Important:** You cannot delete a branch that still has:
> - Assigned employees — Reassign them to another branch first
> - Assigned customers — Reassign them to another branch first
> - Child branches (BLUs) — Remove or reassign child branches first

---

### 7.7 Data Management (Branch Hierarchy)

Navigate to **Data Management** to configure which Branch Lite Units (BLUs) belong to which parent (mother) branch.

#### How It Works

**Step 1: Select a Parent Branch**
- The left column shows all parent-eligible branches
- Click on a branch to select it as the parent
- Each branch shows how many BLUs are currently assigned to it

**Step 2: Assign Branch Lite Units**
- The right column shows all available BLUs
- Check the boxes next to the BLUs you want to assign to the selected parent
- If a BLU is already assigned to a different parent, a warning is shown
- The count of selected BLUs updates as you check/uncheck

Click **Save Assignment** to save the hierarchy changes.

#### Current Hierarchy Summary

At the bottom of the page, a summary shows all existing parent-child relationships for quick reference.

---

### 7.8 System Settings

Navigate to **Settings** to configure system-wide security and operational parameters.

#### Active Policies Banner

Three cards at the top show current policy status:
- **Auto-Logout** — Current session timeout (in minutes)
- **Token Expiration** — Current token expiry (in minutes)
- **Password Expiry** — Enabled/Disabled and expiry period (in days)

#### Section 1: Session & Token Management

| Setting | Description | Default |
|---------|-------------|---------|
| Inactivity Timeout | Minutes of inactivity before auto-logout | 10 min |
| Token Expiration | Minutes before login token expires | 30 min |
| Account Lockout Duration | Minutes an account stays locked after max failed attempts | 30 min |

#### Section 2: Password & Authentication

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Password Expiration | Toggle password expiry policy on/off | Off |
| Password Expiry Period | Days before users must change password | 90 days |
| Max Login Attempts | Failed attempts before account lockout | 5 |
| Require Two-Factor Auth | Force all users to enable 2FA | Off |

#### Section 3: System Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Audit Log Retention | Days to keep audit logs (BSP minimum: 365) | 365 days |
| Timezone | System timezone for timestamps | Asia/Manila |
| Currency Code | Default currency | PHP |
| Notification Email | Email for system notifications | — |
| Maintenance Mode | When enabled, only admins can access the system | Off |

Click **Save Changes** to apply all modifications. All changes are recorded in the audit log.

#### BSP Compliance Requirements

The settings page includes a reminder of BSP compliance requirements:
- Session timeout must not exceed 30 minutes
- Password expiry should not exceed 90 days
- Minimum 5 failed login attempts before lockout
- Audit logs must be retained for at least 365 days

---

## 8. Account Types Explained

| Account Type | Description | Document Upload |
|--------------|-------------|-----------------|
| **Regular** | Single individual account holder | One set of documents per account |
| **Joint — ITF** | In Trust For — One primary holder with beneficiary | Each person uploads their own documents |
| **Joint — Non-ITF** | Multiple holders sharing an account, each may have separate accounts | Each person uploads their own documents per account |
| **Corporate** | Business/company account with authorized signers | Each signer uploads documents; signature card fronts shared, backs per person |

---

## 9. Customer Status Definitions

| Status | Color | Description |
|--------|-------|-------------|
| **Active** | Green | Account is currently active and in good standing |
| **Dormant** | Yellow | Account has been inactive for a specified period with no transactions |
| **Escheat** | Orange | Unclaimed account subject to government escheatment process |
| **Closed** | Red | Account has been permanently closed |
| **Reactivated** | Teal | Previously dormant or closed account that has been restored to active use |

---

## 10. Risk Level Classifications

Risk levels are used for Anti-Money Laundering (AML) compliance as required by BSP:

| Risk Level | Color | Description |
|------------|-------|-------------|
| **Low Risk** | Green | Standard risk — Regular individual accounts with no flags |
| **Medium Risk** | Yellow | Elevated risk — Accounts requiring enhanced due diligence |
| **High Risk** | Red | High risk — Accounts requiring intensive monitoring and reporting |

---

## 11. Data Access Scope by Role

Each role can only see data within their authorized scope:

| Role | Data Access Scope | Description |
|------|-------------------|-------------|
| **User** | Own Branch Only | Can only see customers and data from their assigned branch |
| **Cashier** | Branch + BLU Children | Can see customers from their branch and any Branch Lite Units under it |
| **Manager** | Branch + BLU Children | Can see customers from their branch and any Branch Lite Units under it |
| **Compliance-Audit** | All Branches | Can see data from every branch in the bank |
| **Administrator** | All Branches | Full access to all data across all branches |

---

## 12. Frequently Asked Questions (FAQ)

**Q: I forgot my password. What do I do?**
A: Contact your administrator. They can reset your password from the User Management page. You will receive a temporary password and be asked to change it on your next login.

**Q: My account is locked. What happened?**
A: Your account was locked after too many failed login attempts. Contact your administrator or manager to unlock your account.

**Q: I was logged out while working. Why?**
A: The system automatically logs you out after a period of inactivity (default: 30 minutes) for security. This is a BSP compliance requirement. Simply log in again to continue.

**Q: I uploaded the wrong document. How do I fix it?**
A: Go to Customer Profiles, find the customer, and click **Edit Docs**. Select the document type and upload the correct image. The old document will be automatically archived, and the change will be recorded in the audit log.

**Q: Can I delete a customer record?**
A: Only users with the User or Admin role can delete customer records. A confirmation dialog will appear before deletion. Note that this action is recorded in the audit log.

**Q: Why are some customer images blurred?**
A: Documents for customers with **Dormant** status may appear blurred as a security measure. The documents are still accessible — you can use the image viewer's zoom and pan controls to inspect them.

**Q: Can I access the system from my mobile phone?**
A: Yes, the SigCard System is responsive and works on mobile devices, tablets, and desktop computers. However, for the best experience with document uploads and image viewing, we recommend using a desktop or tablet.

**Q: How do I know who changed a customer's information?**
A: Go to **Audit Logs** and use the **Customer Records** tab. You can search for the specific customer and see the complete history of all changes, including who made each change and when.

**Q: What is a "Mother Branch" vs a "Branch Lite Unit (BLU)"?**
A: A **Mother Branch** is a main branch office. A **Branch Lite Unit (BLU)** is a smaller sub-office that operates under a mother branch. The BLU's data is accessible to the staff of its mother branch.

**Q: How are permissions managed?**
A: Permissions are assigned at the role level by the administrator through the **Roles & Permissions** page. Individual users inherit the permissions of their assigned role.

---

*This manual is maintained by the IT Department of RBT Bank Inc.*
*For technical support, contact your system administrator.*
