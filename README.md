# Hackathon Badge Scanning API

A REST API server for managing hackathon attendee badge scans and activity tracking.

## Setup

1. Install dependencies:
\`\`\`
npm install
\`\`\`

2. Create the database and load initial data:
\`\`\`
npm run setup
\`\`\`

3. Start the server:
\`\`\`
npm start
\`\`\`

## API Documentation

### Get All Users
- **GET** `/users`
- Returns a list of all users with their scan history

### Get User Information
- **GET** `/users/:identifier`
- Identifier can be email or badge_code
- Returns detailed information about a specific user

### Update User Data
- **PUT** `/users/:identifier`
- Identifier can be email or badge_code
- Updates user information (name, phone)
- Cannot update email, badge_code, or scans

### Add Scan
- **POST** `/scan/:identifier`
- Identifier can be email or badge_code
- Body: \`{ "activity_name": "string", "activity_category": "string" }\`
- Records a new scan for the user

### Get Scan Data
- **GET** `/scans`
- Query parameters:
  - min_frequency: Minimum number of scans
  - max_frequency: Maximum number of scans
  - activity_category: Filter by category
- Returns aggregated scan data for activities

## Design Decisions

1. **Database Schema**:
   - Normalized design with separate tables for users, activities, and scans
   - Used triggers to automatically update the updated_at timestamp
   - Enforced unique constraints on email and badge_code

2. **API Design**:
   - RESTful endpoints following standard conventions
   - Support for partial updates
   - Flexible identifier system (email or badge_code)

3. **Data Integrity**:
   - Foreign key constraints
   - Unique constraints on critical fields
   - Transaction support for complex operations

## Assumptions

1. Email addresses and badge codes are unique and immutable
2. Activity names are unique across all categories
3. Times are stored in UTC
4. Partial updates are allowed for user data but not for scans
5. Users can be identified by either email or badge_code

## Testing

Run tests with:
\`\`\`
npm test
\`\`\`

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 400: Bad Request
- 404: Not Found
- 500: Server Error
