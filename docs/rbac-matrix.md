# HostelHub — Role-Based Access Control (RBAC) Matrix

## 1. System Roles Overview

HostelHub enforces strict authorization using a multi-tiered RBAC model:

1. **WARDEN / ADMIN**: Primary administrative authority over hostel blocks, room allocation, student records, leave and guest approvals, notices, and operational metrics.
2. **MESS INCHARGE**: Operational authority over dining hall menus, expected meal count analytics, and student meal feedback.
3. **STUDENT (HOSTELER)**: Residential student residing in a hostel room with full access to room details, roommates, hostel leave, guest requests, complaint submission, and mess services.
4. **STUDENT (DAY SCHOLAR)**: Commuter student with access to personal profile, campus notices, campus/mess complaints, and mess menu; barred from hostel room allocation, hostel leave, and guest passes.

---

## 2. Granular Permissions Matrix

| Feature / Action | Student (Hosteler) | Student (Day Scholar) | Warden / Admin | Mess Incharge | Backend Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Authentication & Profile** | | | | | |
| Login / Refresh Token | ✅ Own | ✅ Own | ✅ Own | ✅ Own | Auth Controller |
| View Own Profile | ✅ Own | ✅ Own | ✅ Own | ✅ Own | `verifyToken` |
| View Other Student Profiles | ❌ | ❌ | ✅ All | ❌ | `requireRole(['WARDEN'])` |
| Create / Edit Students | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| Change Student Type (Hosteler/Day) | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| **Hostel & Room Management** | | | | | |
| Create/Edit Hostels & Floors | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| Create/Edit Rooms & Beds | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| Allocate / Deallocate Beds | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` + Hosteler check |
| View Own Room & Roommates | ✅ Own Room | ❌ Not Allocated | ✅ All Rooms | ❌ | Student profile check + Service query |
| View Room Occupancy Analytics | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| **Complaint Management** | | | | | |
| Submit Complaint | ✅ Own | ✅ Own (Mess/Campus) | ❌ | ❌ | `requireRole(['STUDENT'])` |
| View Own Complaints | ✅ Own | ✅ Own | ❌ | ❌ | Filter by `studentProfileId` |
| View All Complaints & Filter | ❌ | ❌ | ✅ All | 👁️ Mess Only | Role filter in complaintService |
| Update Status / Assign Complaint | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| **Leave Management** | | | | | |
| Submit Leave Request | ✅ Own | ❌ Disallowed | ❌ | ❌ | `requireHosteler` assertion |
| View Own Leave Status/History | ✅ Own | ❌ Disallowed | ❌ | ❌ | Filter by `studentProfileId` |
| Approve / Reject Leave Request | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| View All Leave Requests & History| ❌ | ❌ | ✅ Full | 👁️ Aggregates | `requireRole(['WARDEN', 'MESS_INCHARGE'])` |
| **Guest Management** | | | | | |
| Submit Guest Request | ✅ Own | ❌ Disallowed | ❌ | ❌ | `requireHosteler` assertion |
| View Own Guest Requests & Pass | ✅ Own | ❌ Disallowed | ❌ | ❌ | Filter by `studentProfileId` |
| Approve / Reject Guest Request | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| View Guest Pass Details / Today | 👁️ Own Pass | ❌ Disallowed | ✅ All Passes | 👁️ Meal Count | Service filter |
| **Notice Management** | | | | | |
| Create / Edit / Pin Notices | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |
| View Targeted Notices | 👁️ Targeted | 👁️ Targeted | ✅ All | 👁️ All | Query filter by `targetAudience` |
| **Mess Management** | | | | | |
| View Weekly / Daily Menu | 👁️ Read | 👁️ Read | 👁️ Read | ✅ Full Manage | `requireRole(['MESS_INCHARGE'])` |
| Update / Publish Menu | ❌ | ❌ | ❌ | ✅ Full Manage | `requireRole(['MESS_INCHARGE'])` |
| View Expected Meal Counts | ❌ | ❌ | 👁️ Read | ✅ Full View | Formula computation service |
| Submit Meal Feedback | ✅ Own | ✅ Own | ❌ | ❌ | `requireRole(['STUDENT'])` |
| View Feedback Analytics / Scores | ❌ | ❌ | 👁️ Read | ✅ Full View | `requireRole(['MESS_INCHARGE', 'WARDEN'])` |
| **Campus Presence / Geofence** | | | | | |
| Submit Location Coordinates | ✅ Own | ✅ Own | ❌ | ❌ | `requireRole(['STUDENT'])` |
| View Own Presence Log | ✅ Own | ✅ Own | ❌ | ❌ | Filter by `studentProfileId` |
| View Campus Presence Analytics | ❌ | ❌ | ✅ Full | ❌ | `requireRole(['WARDEN'])` |

---

## 3. Enforcement Implementation

### 3.1. Authentication Middleware (`verifyToken`)
Extracts the bearer token from HTTP headers, verifies its cryptographic signature, and binds the payload (`req.user = { userId, role, email }`) to the Express Request object.

### 3.2. RBAC Guard Middleware (`requireRole`)
A reusable higher-order function:
```typescript
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient role permissions.',
      });
    }
    next();
  };
};
```

### 3.3. Student Type Assertion (`requireHosteler`)
Protects hostel-only routes:
```typescript
export const requireHosteler = async (req: Request, res: Response, next: NextFunction) => {
  const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
  if (!profile || profile.studentType !== 'HOSTELER') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Feature is exclusive to residential hostelers.',
    });
  }
  req.studentProfile = profile;
  next();
};
```
