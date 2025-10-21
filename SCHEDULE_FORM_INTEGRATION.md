# Schedule Form Integration Guide

## Overview

The Schedule Form has been enhanced with real-time conflict checking and available slots functionality using the new `get_available_time_slots.php` API endpoint.

## New Features Added

### 1. Real-time Available Slots Checking

- Automatically checks available time slots when form fields change
- Debounced to prevent excessive API calls (500ms delay)
- Shows available slots in an interactive UI

### 2. Enhanced Form Validation

- Pre-submission validation using the new API
- Visual feedback for available/conflicting time slots
- Prevents submission of conflicting schedules

### 3. Interactive Time Slot Selection

- Click-to-select available time slots
- Visual grid layout for easy browsing
- Real-time updates as form changes

## API Integration

### New Endpoint Used

```javascript
POST / get_available_time_slots.php;
```

**Request Body:**

```javascript
{
  "school_year": "2024-2025",
  "semester": "First Semester",
  "days": ["Monday", "Wednesday", "Friday"],
  "prof_id": 1,
  "room_id": 1,
  "section_id": 1
}
```

**Response:**

```javascript
{
  "success": true,
  "available_slots": {
    "Monday": [
      { "start_time": "08:00:00", "end_time": "09:00:00" },
      { "start_time": "10:00:00", "end_time": "11:00:00" }
    ],
    "Wednesday": [
      { "start_time": "08:00:00", "end_time": "09:00:00" }
    ]
  },
  "conflicts": null
}
```

## Form Behavior

### 1. Automatic Slot Checking

The form automatically checks for available slots when:

- School year is entered
- Semester is selected
- Days are selected
- Professor is selected
- Section is selected
- Room is selected (for onsite schedules)

### 2. Manual Slot Checking

Users can manually trigger slot checking using the "Check Available Slots" button.

### 3. Time Slot Selection

- Available slots are displayed in a grid format
- Users can click on any available slot to auto-fill start/end times
- Selected slots are highlighted

### 4. Conflict Prevention

- Form prevents submission if selected time slot is not available
- Shows error message with option to view available slots
- Visual indicators for conflicting inputs

## UI Components

### Available Slots Display

```jsx
<div className="available-slots-container">
  <h4>Available Time Slots</h4>
  <div className="slot-grid">
    <button className="time-slot-button">08:00 - 09:00</button>
  </div>
</div>
```

### Check Slots Button

```jsx
<Button onClick={checkSlotsInRealTime}>Check Available Slots</Button>
```

## CSS Classes

### Main Container

- `.available-slots-container` - Main container for available slots
- `.day-slots` - Container for each day's slots
- `.slot-grid` - Grid layout for time slot buttons

### Interactive Elements

- `.time-slot-button` - Clickable time slot buttons
- `.loading-spinner` - Loading animation
- `.day-header` - Day name headers

### Form States

- `.form-field-error` - Error state styling
- `.form-field-success` - Success state styling
- `.conflict-highlight` - Conflict warning styling

## Form Submission Flow

1. **Pre-validation**: Check available slots using new API
2. **Slot Validation**: Verify selected time slot is available
3. **Conflict Check**: Run existing conflict validation
4. **Schedule Creation**: Create schedule if all checks pass
5. **Success/Error**: Show appropriate feedback

## Error Handling

### Available Slots Errors

- API connection failures
- Invalid response format
- No available slots found

### Conflict Errors

- Time slot conflicts
- Professor overload
- Room conflicts
- Section conflicts

## Performance Optimizations

### Debouncing

- Real-time checking is debounced to 500ms
- Prevents excessive API calls during typing

### Conditional Loading

- Only checks slots when required fields are filled
- Skips unnecessary API calls

### Caching

- Available slots are cached in component state
- Reused until form values change

## Testing Checklist

### Basic Functionality

- [ ] Form loads with all required fields
- [ ] Available slots check triggers automatically
- [ ] Manual slot checking works
- [ ] Time slot selection updates form
- [ ] Form submission works with valid data

### Conflict Prevention

- [ ] Conflicting time slots are rejected
- [ ] Error messages are clear and helpful
- [ ] Available slots are shown when conflicts occur
- [ ] Form prevents submission with conflicts

### UI/UX

- [ ] Available slots display is responsive
- [ ] Loading states are shown appropriately
- [ ] Visual feedback is clear
- [ ] Form is accessible and user-friendly

### API Integration

- [ ] API calls are made correctly
- [ ] Response data is handled properly
- [ ] Error states are handled gracefully
- [ ] Performance is acceptable

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Mobile Responsiveness

The form is fully responsive with:

- Grid layout that adapts to screen size
- Touch-friendly button sizes
- Readable text on small screens
- Proper spacing and padding

## Future Enhancements

### Potential Improvements

1. **Caching**: Cache available slots for better performance
2. **Predictive Loading**: Pre-load slots for common combinations
3. **Advanced Filtering**: Filter slots by room type, capacity, etc.
4. **Bulk Operations**: Allow multiple schedule creation
5. **Export/Import**: Schedule data export functionality

### API Enhancements

1. **Real-time Updates**: WebSocket for live slot updates
2. **Batch Checking**: Check multiple time slots at once
3. **Advanced Analytics**: Usage statistics and insights
4. **Integration**: Connect with calendar systems

## Troubleshooting

### Common Issues

1. **Slots Not Loading**

   - Check API endpoint availability
   - Verify database connection
   - Check browser console for errors

2. **Form Not Submitting**

   - Ensure all required fields are filled
   - Check for validation errors
   - Verify time slot availability

3. **Performance Issues**
   - Check API response times
   - Verify debouncing is working
   - Monitor network requests

### Debug Steps

1. Open browser developer tools
2. Check Network tab for API calls
3. Verify request/response data
4. Check console for JavaScript errors
5. Test with different form combinations

## Support

For issues or questions:

1. Check this documentation
2. Review browser console errors
3. Test with minimal form data
4. Contact development team

---

**Last Updated**: December 2024
**Version**: 2.0.0
**Compatibility**: React 18+, TypeScript 4.5+
