# Authentication System - Testing Guide

## System Overview

Your authentication system now uses **email and password** with these features:

- Sign up with full name, email, and password
- Login with email and password
- Password hashing with SHA-256
- Secure token storage
- Protected routes

## Testing Workflow

### Step 1: Sign Up
1. Go to home page
2. Click "Sign Up" button
3. Fill in:
   - Full Name: `John Doe`
   - Email: `john@example.com`
   - Password: `Password123` (min 8 chars)
   - Confirm Password: `Password123`
4. Click "Create Account"
5. Should see success message
6. Automatically redirected to login page

### Step 2: Login
1. On login page, enter:
   - Email: `john@example.com`
   - Password: `Password123`
2. Click "Sign In"
3. Should redirect to dashboard
4. Dashboard shows your name and email

### Step 3: Verify Protected Routes
1. From dashboard, copy the URL
2. Open new tab and try to access `/youtube-scraper`
3. Without login, should redirect to login page
4. Login again, now can access YouTube scraper

### Step 4: Test Session Persistence
1. After logging in, refresh the page
2. Should stay logged in (token persists in localStorage)
3. Open browser DevTools → Application → LocalStorage
4. You'll see `auth_token` and `user_id` stored

### Step 5: Logout
1. From dashboard, click logout button (top right icon)
2. Should redirect to home page
3. Try accessing dashboard again → redirects to login

## Test Cases

### Valid Signup
- Email: `test@example.com`
- Password: `SecurePass123`
- Result: Success ✓

### Invalid Email
- Email: `invalidemail`
- Result: Error: "Invalid email address" ✓

### Password Too Short
- Password: `pass123`
- Result: Error: "Password must be at least 8 characters" ✓

### Passwords Don't Match
- Password: `Password123`
- Confirm: `Password456`
- Result: Error: "Passwords do not match" ✓

### Duplicate Email
- Sign up with `test@example.com`
- Try again with same email
- Result: Error: "Email already exists" ✓

### Wrong Password
- Email: `john@example.com`
- Password: `WrongPassword`
- Result: Error: "Invalid email or password" ✓

### Wrong Email
- Email: `nouser@example.com`
- Password: `Password123`
- Result: Error: "Invalid email or password" ✓

## Database Check

To verify data is stored correctly in Supabase:

1. Go to Supabase dashboard
2. Navigate to "SQL Editor"
3. Run this query:
   ```sql
   SELECT id, full_name, email, created_at FROM users;
   ```
4. You should see all registered users
5. Passwords are hashed (SHA-256)

## File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx       (Auth logic, signup, signin)
├── pages/
│   ├── Login.tsx              (Login form)
│   ├── Signup.tsx             (Signup form)
│   ├── Dashboard.tsx          (Protected dashboard)
│   └── Home.tsx               (Landing page)
├── components/
│   └── ProtectedRoute.tsx     (Route protection)
└── lib/
    └── supabase.ts            (Database client)
```

## How It Works

### Signup Flow
1. User enters full name, email, password
2. Password validated (8+ chars)
3. Password hashed using SHA-256
4. User inserted into `users` table
5. Token created and stored locally
6. User redirected to dashboard

### Login Flow
1. User enters email and password
2. Email looked up in database
3. Password hashed and compared with stored hash
4. If match: create token, store locally
5. If no match: show error message

### Session Persistence
1. On app load, AuthContext checks localStorage
2. If token exists, verifies user in database
3. If valid, user stays logged in
4. If invalid/expired, clears token and redirects

### Protected Routes
1. ProtectedRoute component checks if user exists
2. If no user: redirects to login
3. If loading: shows spinner
4. If user: shows requested page

## Production Checklist

Before deploying to production:

- [ ] Enable HTTPS
- [ ] Use environment variables for sensitive data
- [ ] Implement rate limiting on login/signup
- [ ] Add email verification
- [ ] Add password reset functionality
- [ ] Use httpOnly cookies instead of localStorage
- [ ] Implement session timeout
- [ ] Add two-factor authentication
- [ ] Log all auth attempts
- [ ] Regular security audits

## Troubleshooting

**Can't login after signup:**
- Check email capitalization (system uses lowercase)
- Verify password is correct
- Check browser console for errors

**Token not persisting on refresh:**
- Check if localStorage is enabled
- Clear browser cache and try again
- Check if token storage is working in DevTools

**Account creation fails:**
- Check if email already exists
- Verify password is 8+ characters
- Check Supabase connection status

**Dashboard shows blank name:**
- Full name is required during signup
- If missing, will show email instead
- Check database to verify name was stored

## Contact & Support

For issues or questions:
- Check browser console (F12) for error messages
- Verify Supabase connection in `.env` file
- Test with valid, unique email addresses
- Clear browser cache if pages not loading
