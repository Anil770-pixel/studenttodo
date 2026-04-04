# Database Sync & Repair System 🛠️

## Overview
This system ensures that every user has a proper Firestore database document, which is essential for saving tasks, events, and other data in StudentOS.

## Components Implemented

### 1. Login Page Sync (`src/pages/Login.jsx`)
**When it runs:** Every time a user logs in (Google or Email)

**What it does:**
- Checks if the user document exists in `users/{uid}`
- If **missing**, creates a new document with:
  - Full name, email, uid, photoURL
  - Branch (defaults to "General")
  - Empty interests array
  - Profile completion status
  - Active radar status
- If **exists**, logs confirmation and continues

**Console logs:**
- ✅ "New student folder created in Database!" (new user)
- ✅ "User already exists in database" (existing user)

---

### 2. Dashboard Repair (`src/pages/Dashboard.jsx`)
**When it runs:** Every time the Dashboard page loads

**What it does:**
- Acts as a **safety net** in case the login sync didn't work
- Checks if user document exists when entering Dashboard
- Creates missing document with the same structure as Login sync
- Shows an **alert** if it had to repair the database

**Console logs:**
- 🛠️ "Repairing Database for: [email]" (repair needed)
- ✅ "Database Connected! User document created." (repair successful)
- ✅ "User document exists in database" (no repair needed)

**User feedback:**
- Alert: "Database Connected! ✅ You can now save tasks." (if repaired)

---

## How It Works (Flow)

### New User Flow:
```
1. User clicks "Sign In with Google" or enters email/password
   ↓
2. Firebase Authentication creates the auth account
   ↓
3. Login.jsx syncUserWithDatabase() runs
   ↓
4. Checks Firestore for users/{uid} document
   ↓
5. Document doesn't exist → Creates it with default structure
   ↓
6. User redirected to Calendar/Dashboard
   ↓
7. Dashboard.jsx repairUserData() runs
   ↓
8. Document exists (already created in step 5) → No action needed
```

### Existing User Flow:
```
1. User logs in
   ↓
2. Login sync checks → Document exists → Continues
   ↓
3. Dashboard repair checks → Document exists → Continues
```

### Broken Database Flow (Edge Case):
```
1. User somehow has auth but no Firestore document
   ↓
2. Login sync may fail or skip
   ↓
3. User opens Dashboard
   ↓
4. Dashboard repair detects missing document
   ↓
5. Creates document and shows alert
   ↓
6. User can now save data ✅
```

---

## Database Document Structure

When a user document is created, it contains:

```javascript
{
  fullName: "John Doe",           // From displayName or "Student"
  email: "john@example.com",      // From auth email
  uid: "mtcc...",                 // Firebase user ID
  photoURL: "https://...",        // Profile photo (empty if none)
  branch: "General",              // Study domain (default)
  interests: [],                  // Selected interests (empty initially)
  createdAt: "2026-02-17T...",   // ISO timestamp
  profileCompleted: false,        // Whether onboarding is done
  radarStatus: "active"           // Interest Radar status
}
```

---

## Testing

### How to verify it's working:

1. **Check Browser Console (F12 → Console)**
   - Look for the ✅ and 🛠️ emoji messages
   - No errors should appear during login or dashboard load

2. **Check Firestore Database**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to: Firestore Database → Data
   - Look for `users/{your_uid}` collection
   - Your document should exist with all fields

3. **Try Creating Tasks**
   - Go to the Todos page
   - Add a new task
   - It should save without errors
   - Refresh the page - task should persist

---

## Troubleshooting

### "Permission Denied" Errors
- **Cause:** Firestore security rules are too restrictive
- **Fix:** Update rules in Firebase Console:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```

### "Document Not Created"
- **Cause:** Firebase configuration issue or network error
- **Fix:** 
  1. Check `src/firebase.js` configuration
  2. Verify Firestore is enabled in Firebase project
  3. Check browser console for detailed error messages

### "Alert Keeps Popping Up"
- **Cause:** Dashboard repair is creating the document every time
- **Likely issue:** Login sync is failing
- **Fix:** Check Login page console logs to see why sync is failing

---

## Code Locations

- **Login Sync Function:** `src/pages/Login.jsx` (lines 7-30)
- **Dashboard Repair Function:** `src/pages/Dashboard.jsx` (lines 52-89)
- **AuthContext Login Methods:** `src/context/AuthContext.jsx` (lines 107-123)

---

## Benefits

✅ **Automatic:** No manual setup required for new users  
✅ **Redundant:** Multiple safety nets (login + dashboard)  
✅ **Debug-friendly:** Clear console logs for troubleshooting  
✅ **User-friendly:** Alert notification if repair was needed  
✅ **Consistent:** Same structure created every time
