# Authentication System Setup for School Heads

This document explains how to set up the authentication system that connects school head accounts created by admins to the login functionality.

## Overview

The system now allows school heads created through the admin interface to log in using their credentials. When an admin creates a school head account, that account can immediately be used for authentication.

## Files Created/Modified

### 1. Authentication Service (`src/services/authService.ts`)

- Handles login verification for both admin and school head users
- Connects to PHP backend for school head authentication
- Maintains admin authentication (currently hardcoded)

### 2. Updated Login Component (`src/pages/Login.tsx`)

- Now uses the authentication service instead of hardcoded credentials
- Automatically redirects users based on their role
- Shows helpful tips about using admin-created accounts

### 3. PHP Authentication Backend (`auth_acad_head.php`)

- Verifies school head credentials against the database
- Returns user information for successful logins
- Handles CORS and security headers

### 4. Updated AuthContext (`src/contexts/AuthContext.tsx`)

- Now uses the authentication service for logout functionality

## Setup Instructions

### 1. Database Configuration

Update the database connection details in `auth_acad_head.php`:

```php
$host = 'localhost';
$dbname = 'spcc_database'; // Your actual database name
$dbuser = 'root'; // Your database username
$dbpass = ''; // Your database password
```

### 2. File Placement

Place `auth_acad_head.php` in your PHP backend directory:

```
https://spcc-scheduler.site/auth_acad_head.php
```

### 3. Database Table Structure

Ensure your `acad_head` table has these columns:

```sql
CREATE TABLE acad_head (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL
);
```

## How It Works

### 1. Admin Creates School Head Account

- Admin goes to School Head Management
- Creates new school head with username and password
- Account is saved to database

### 2. School Head Logs In

- School head goes to login page
- Enters username and password
- System checks credentials against database
- If valid, creates session and redirects to appropriate dashboard

### 3. Authentication Flow

```
Login Form → authService.login() → PHP Backend → Database → User Session
```

## Security Considerations

### Current Implementation

- Passwords are stored as plain text (for development)
- Basic input validation
- CORS headers for cross-origin requests

### Production Recommendations

1. **Password Hashing**: Use PHP's `password_hash()` and `password_verify()`
2. **HTTPS**: Ensure all communication is encrypted
3. **Session Management**: Implement proper session handling
4. **Rate Limiting**: Prevent brute force attacks
5. **Input Sanitization**: Enhanced input validation

## Testing the System

### 1. Create School Head Account

1. Log in as admin
2. Go to School Head Management
3. Add new school head with username and password
4. Note the credentials

### 2. Test School Head Login

1. Log out of admin account
2. Go to login page
3. Use the school head credentials
4. Should redirect to school head dashboard

### 3. Verify Role-Based Access

- Admin users should see admin interface
- School head users should see school head interface
- Proper navigation based on user role

## Troubleshooting

### Common Issues

1. **CORS Errors**

   - Ensure PHP file has proper CORS headers
   - Check if backend URL is correct in authService

2. **Database Connection Errors**

   - Verify database credentials in PHP file
   - Check if database server is running
   - Ensure table structure matches expected format

3. **Authentication Fails**
   - Check browser console for errors
   - Verify PHP file is accessible
   - Check database for user existence

### Debug Steps

1. Check browser network tab for API calls
2. Verify PHP error logs
3. Test database connection manually
4. Check user table for correct data

## Future Enhancements

1. **Admin Authentication**: Move admin credentials to database
2. **Password Reset**: Implement password reset functionality
3. **Account Lockout**: Add failed login attempt limits
4. **Audit Logging**: Track login attempts and user actions
5. **Multi-Factor Authentication**: Add 2FA support

## Support

If you encounter issues:

1. Check the browser console for JavaScript errors
2. Verify PHP backend is accessible
3. Confirm database connection and table structure
4. Review this documentation for setup requirements
