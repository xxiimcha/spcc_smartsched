# Enhanced Scheduling System

## Overview

The Enhanced Scheduling System is a comprehensive solution designed specifically for senior high school scheduling. It focuses on functionality, ease of use, and intelligent conflict prevention to make professor scheduling as efficient as possible.

## Key Features

### 🎯 **Smart Room Management**

- **Room-Assigned Sections Only**: Only sections with assigned rooms are available for scheduling
- **Automatic Room Selection**: When a section is selected, only its assigned rooms are shown
- **Room Type Validation**: Automatically sets room type based on selected room

### ⚡ **Intelligent Conflict Detection**

- **Real-time Conflict Checking**: Detects conflicts as you fill out the form
- **Clear Conflict Solutions**: Provides specific suggestions for resolving conflicts
- **Alternative Time Slots**: Shows available time slots when conflicts occur
- **Force Override Option**: Allows administrators to override conflicts when necessary

### 🕒 **Smart Time Management**

- **Available Time Slots**: Shows only available time slots based on existing schedules
- **Conflict-Free Scheduling**: Prevents double-booking of professors, rooms, and sections
- **Time Slot Filtering**: Automatically filters out conflicting time slots
- **One-Click Time Selection**: Click on available slots to auto-fill start/end times

### 👨‍💼 **Admin-Controlled Academic Periods**

- **Centralized Settings**: School year and semester managed by administrators only
- **Consistent Periods**: All scheduling uses the same academic period
- **Easy Period Changes**: Simple interface for updating academic periods

## System Architecture

### Backend APIs

#### 1. `get_room_assigned_sections.php`

- **Purpose**: Retrieves only sections that have assigned rooms
- **Method**: GET
- **Response**: Array of sections with their assigned rooms
- **Usage**: Populates section dropdown in schedule form

#### 2. `get_available_time_slots.php`

- **Purpose**: Returns available time slots based on existing schedules
- **Method**: POST
- **Parameters**: school_year, semester, days, prof_id, room_id, section_id
- **Response**: Available time slots grouped by day
- **Usage**: Real-time slot checking and display

#### 3. `enhanced_conflict_detection.php`

- **Purpose**: Comprehensive conflict detection with solutions
- **Method**: POST
- **Parameters**: All schedule details
- **Response**: Detailed conflict information with suggested solutions
- **Usage**: Pre-submission validation and conflict resolution

### Frontend Components

#### 1. `EnhancedScheduleForm.tsx`

- **Purpose**: Main scheduling interface
- **Features**:
  - Room-assigned sections only
  - Real-time conflict checking
  - Available time slots display
  - Clear conflict resolution UI
  - Admin-controlled academic periods

#### 2. `SystemSettings.tsx`

- **Purpose**: Admin interface for managing academic periods
- **Features**:
  - School year and semester management
  - Settings persistence
  - Next period preview
  - Admin-only access

#### 3. `EnhancedScheduling.tsx`

- **Purpose**: Main scheduling page
- **Features**:
  - Dashboard with quick stats
  - Feature overview
  - Integrated form and settings

## Database Requirements

### Required Tables

- `sections` - Section information (with `room_ids` field for room assignments)
- `rooms` - Room information
- `professors` - Professor information
- `subjects` - Subject information
- `schedules` - Schedule records

### Key Relationships

- Sections have assigned rooms via the `room_ids` field (comma-separated list)
- Schedules reference sections, professors, subjects, and rooms
- Time conflicts are checked across all schedule records

## Installation & Setup

### 1. Backend Setup

```bash
# Place PHP files in your backend directory
cp *.php /path/to/your/backend/
```

### 2. Database Setup

```sql
-- Ensure sections table has room_ids field
ALTER TABLE sections ADD COLUMN IF NOT EXISTS room_ids TEXT;

-- Update existing sections to have room assignments if needed
-- Example: UPDATE sections SET room_ids = '1,2,3' WHERE section_id = 1;
```

### 3. Frontend Integration

```tsx
// Import the enhanced components
import EnhancedScheduleForm from "@/components/scheduling/EnhancedScheduleForm";
import SystemSettings from "@/components/admin/SystemSettings";
import EnhancedScheduling from "@/pages/EnhancedScheduling";

// Use in your application
<EnhancedScheduling />;
```

## Usage Guide

### For Administrators

#### 1. Setting Up Academic Periods

1. Navigate to System Settings
2. Set current school year and semester
3. Save settings
4. All scheduling will use these periods

#### 2. Managing Room Assignments

1. Ensure sections have assigned rooms in the database
2. Only sections with rooms will appear in scheduling
3. Use the section-room assignment interface

### For Schedulers

#### 1. Creating a Schedule

1. Open the Enhanced Schedule Form
2. Select a section (only room-assigned sections shown)
3. Choose subject and professor
4. Select schedule type (Onsite/Online)
5. Pick days and times
6. System automatically checks for conflicts
7. Review available time slots if needed
8. Submit schedule

#### 2. Handling Conflicts

1. If conflicts are detected, review the conflict dialog
2. See specific conflict details and solutions
3. Choose from alternative time slots
4. Or force create if necessary (admin only)

## Conflict Resolution

### Types of Conflicts

1. **Professor Conflicts**: Professor already has a class at that time
2. **Room Conflicts**: Room is already booked at that time
3. **Section Conflicts**: Section already has a class at that time

### Resolution Options

1. **Select Different Time**: Choose from available time slots
2. **Select Different Professor**: Choose another available professor
3. **Select Different Room**: Choose another available room
4. **Force Override**: Override conflicts (admin only)

## Best Practices

### 1. Room Assignment

- Assign rooms to sections before scheduling
- Ensure room capacity matches section size
- Use appropriate room types (Lecture/Laboratory)

### 2. Time Management

- Check available slots before manual time entry
- Use the conflict detection system
- Plan schedules in advance

### 3. Conflict Prevention

- Review conflicts carefully before overriding
- Use alternative time slots when possible
- Communicate schedule changes to affected parties

## Troubleshooting

### Common Issues

#### 1. No Sections Available

- **Cause**: Sections don't have assigned rooms
- **Solution**: Assign rooms to sections in the database

#### 2. No Available Time Slots

- **Cause**: Heavy scheduling or conflicts
- **Solution**: Check different days or times, or use online scheduling

#### 3. Conflicts Not Detected

- **Cause**: API issues or database problems
- **Solution**: Check API endpoints and database connections

### Debug Steps

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check database connections
4. Review section-room assignments
5. Test with minimal data

## API Endpoints

### Base URL

```
https://spcc-scheduler.site/
```

### Available Endpoints

- `GET get_room_assigned_sections.php` - Get sections with rooms
- `POST get_available_time_slots.php` - Get available time slots
- `POST enhanced_conflict_detection.php` - Check for conflicts
- `POST schedule.php` - Create schedule
- `GET professors.php` - Get professors
- `GET subjects.php` - Get subjects

## Security Considerations

### 1. Admin Access

- System settings are admin-only
- Force override is admin-only
- Academic period changes require admin privileges

### 2. Data Validation

- All inputs are validated on both frontend and backend
- SQL injection prevention with prepared statements
- XSS protection with proper output escaping

### 3. Error Handling

- Graceful error handling for API failures
- User-friendly error messages
- Logging for debugging purposes

## Performance Optimizations

### 1. Database

- Indexed columns for faster queries
- Optimized conflict detection queries
- Efficient time slot generation

### 2. Frontend

- Debounced real-time checking
- Cached API responses
- Optimized re-renders

### 3. API

- Efficient conflict detection algorithms
- Minimal database queries
- Proper error handling

## Future Enhancements

### Planned Features

1. **Bulk Scheduling**: Schedule multiple classes at once
2. **Schedule Templates**: Save and reuse common schedules
3. **Calendar Integration**: Export to calendar applications
4. **Mobile App**: Mobile interface for scheduling
5. **Analytics**: Scheduling statistics and insights

### Technical Improvements

1. **Real-time Updates**: WebSocket for live updates
2. **Caching**: Redis for better performance
3. **API Versioning**: Versioned API endpoints
4. **Testing**: Comprehensive test suite

## Support

### Documentation

- This README file
- Inline code comments
- API documentation

### Contact

- Development Team: [Your Contact Info]
- Technical Support: [Support Contact]
- Bug Reports: [Bug Report System]

---

**Version**: 2.0.0  
**Last Updated**: December 2024  
**Compatibility**: React 18+, TypeScript 4.5+, PHP 7.4+
