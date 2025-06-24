# Note-Taking App Development Guide

## Project Overview
Full-stack collaborative note-taking application with Django REST API backend and React TypeScript frontend. Features real-time collaboration, multiple block types (text, heading, code, LaTeX, images, tables, lists), and WebSocket support.

## Architecture
- **Backend**: Django 5.2.3 + Django REST Framework + PostgreSQL + Channels (WebSocket)
- **Frontend**: React 19.1 + TypeScript + Socket.io-client + @dnd-kit (drag & drop)
- **Authentication**: Token-based authentication with rest_framework.authtoken

## Bash Commands

### Quick Start (Void Linux with runit)
- `./start.sh`: Start both backend and frontend servers
- `./start.sh stop`: Stop all servers
- `./start.sh restart`: Restart all servers
- `./start.sh status`: Check server status
- `./start.sh logs backend`: View Django logs
- `./start.sh logs frontend`: View React logs

### Backend (from `/backend/` directory)
- `source venv/bin/activate`: Activate Python virtual environment
- `python manage.py runserver --noreload`: Start Django development server
- `python manage.py migrate`: Apply database migrations
- `python manage.py makemigrations`: Generate new migrations
- `python manage.py shell`: Open Django shell for debugging
- `python manage.py test`: Run backend unit tests

### Frontend (from `/frontend/` directory)
- `npm start`: Start React development server on port 3000
- `npm test -- --watchAll=false`: Run frontend tests once
- `npm run build`: Build production bundle
- `npm install`: Install dependencies

### API Testing
- Authentication: `curl -X POST -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass123"}' http://localhost:8000/api/auth/token/`
- Get notes: `curl -H "Authorization: Token <token>" http://localhost:8000/api/notes/`
- Get blocks: `curl -H "Authorization: Token <token>" "http://localhost:8000/api/blocks/?note_id=<note_id>"`
- Delete note (hard): `curl -X DELETE -H "Authorization: Token <token>" http://localhost:8000/api/notes/<note_id>/`
- Delete block (hard): `curl -X DELETE -H "Authorization: Token <token>" http://localhost:8000/api/blocks/<block_id>/`
- Test image upload: `curl -X POST -H "Authorization: Token <token>" http://localhost:8000/api/upload/image/` (returns "No image file provided" error if working)

## Development Environment

### Test User Credentials
- **Username**: `testuser`
- **Password**: `testpass123`
- **Token**: Available via authentication endpoint

### Ports
- Django backend: `http://localhost:8000`
- React frontend: `http://localhost:3000`
- WebSocket: `ws://localhost:8000/ws/notes/{noteId}/`

## Code Style & Guidelines

### Frontend
- **IMPORTANT**: Always use optional chaining when accessing `block.content?.property` to prevent undefined errors
- Use TypeScript strict mode - all components must be properly typed
- Destructure imports: `import { Component } from 'library'`
- Use ES modules (import/export), not CommonJS
- Block components must handle undefined content gracefully
- Use functional components with hooks, avoid class components

### Backend
- Follow Django REST Framework patterns with ViewSets and Serializers
- Always check user permissions in get_queryset() methods
- **IMPORTANT**: System now uses HARD DELETION - deleted items are permanently removed from database
- Validate content structure in serializers based on block_type
- Create BlockVersion entries for content change tracking

## Critical Files & Components

### Core Models
- `backend/apps/notes/models.py`: Note model with owner/collaborators
- `backend/apps/blocks/models.py`: Block model with JSON content field
- `backend/apps/users/models.py`: User extensions

### API Endpoints
- `backend/apps/notes/views.py`: NoteViewSet with collaboration features
- `backend/apps/blocks/views.py`: BlockViewSet with content management + upload_image function
- `backend/apps/notes/urls.py` & `backend/apps/blocks/urls.py`: URL routing
- **Image Upload**: `/api/upload/image/` endpoint in blocks app handles file uploads

### Frontend Components
- `frontend/src/components/Editor/Editor.tsx`: Main editor with drag & drop
- `frontend/src/components/Editor/blocks/`: Block type implementations
- `frontend/src/services/api.ts`: API service with authentication
- `frontend/src/services/websocket.ts`: Real-time collaboration service

## Block Types & Content Structure

### Content Schemas
```typescript
TextBlock: { text: string, formatting?: object }
HeadingBlock: { text: string, level: 1-6 }
CodeBlock: { code: string, language: string }
LatexBlock: { formula: string, display?: boolean }
ImageBlock: { url: string, alt: string, caption?: string, width?: number, height?: number }
TableBlock: { rows: string[][], headers: string[] }
ListBlock: { items: string[], ordered: boolean }
```

## Common Issues & Solutions

### Block Content Undefined Errors
- **Symptom**: `Cannot read property 'text' of undefined`
- **Cause**: Block components accessing content before it's loaded
- **Solution**: Use optional chaining `block.content?.text` throughout all block components

### Block Creation/Update Failures
- **Symptom**: Blocks not saving or disappearing after edit
- **Cause**: Permission issues in BlockViewSet.get_queryset()
- **Solution**: Ensure get_queryset() handles both list and individual operations with proper user filtering

### Text Disappearing on Blur
- **Symptom**: Text resets to empty when clicking elsewhere
- **Cause**: Error handling reverts entire block state
- **Solution**: Only revert specific failed block, not entire blocks array

### Image Upload Issues
- **Symptom**: Image upload succeeds but image disappears immediately
- **Root Cause**: BlockSerializer validation fails during PATCH requests because `validate_content()` method couldn't find `block_type` in request data
- **Solution**: Fixed in `backend/apps/blocks/serializers.py` - now gets `block_type` from existing instance during updates
- **File limits**: Max 10MB, supports JPEG/PNG/GIF/WebP formats
- **Storage**: Files saved to `backend/media/images/` directory
- **IMPORTANT**: For image block updates, the serializer must use `self.instance.block_type` not `self.initial_data.get('block_type')`

### Date Formatting Issues
- **Symptom**: Sidebar shows "invalid date" instead of proper relative dates
- **Root Causes**: 
  1. Incorrect date calculation logic in formatDate() function
  2. API field mismatch between backend and frontend
- **Solutions Applied**:
  1. Fixed formatDate() logic: Use Math.floor() instead of Math.ceil(), remove Math.abs(), correct day mapping (0 days = Today, 1 day = Yesterday)
  2. Updated Sidebar component to use `note.last_modified || note.updated_at` for compatibility
  3. Added `last_modified?: string` field to Note interface
- **IMPORTANT**: NoteListSerializer returns `last_modified` field, NoteSerializer returns `updated_at` - frontend must handle both
- **Fixed Files**: `frontend/src/components/Sidebar/Sidebar.tsx`, `frontend/src/types/index.ts`

### Deletion Behavior (IMPORTANT - UPDATED)
- **System uses HARD DELETION**: Notes/blocks are permanently removed from database
- **Frontend delete works correctly**: Click delete → API call → hard delete → item completely removed
- **No recovery**: Deleted items are permanently gone - no database cleanup needed
- **API responses**: Only existing items appear (no need for is_deleted filtering)

## Testing Guidelines

### Backend Testing
- Test user permissions for notes and blocks
- Validate content schemas for different block types
- Test hard deletion behavior (items completely removed)
- Verify authentication token functionality
- **IMPORTANT**: Test image block updates with PATCH requests to ensure serializer validation works correctly
- **Test image upload flow**: Upload file → update block content → verify no 400 errors → confirm image persists

### Frontend Testing
- Test block rendering with undefined content
- Test drag & drop reordering
- Test real-time collaboration features
- Test error recovery and graceful degradation

## WebSocket & Real-time Features

### Setup
- Backend uses Django Channels with Redis
- Frontend uses Socket.io-client
- Connection URL: `/ws/notes/{noteId}/`
- Authentication via token in connection auth

### Events
- `block_updated`, `block_created`, `block_deleted`
- `blocks_reordered`, `user_joined`, `user_left`
- `cursor_moved`, `user_selection_changed`

## Database Schema Notes

### Unique Constraints
- `(note, order)` unique together in Block model
- Handle order conflicts when creating/reordering blocks

### JSON Content Field
- Flexible storage for different block types
- Validate content structure in serializers
- Store content history in BlockVersion model

## Deployment Considerations

### Environment Variables
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database configuration
- `REACT_APP_API_URL`: Frontend API base URL
- `REACT_APP_WS_URL`: WebSocket connection URL

### File Storage
- **Media files**: Stored in `backend/media/` directory
- **Image uploads**: Saved to `backend/media/images/` with UUID-based filenames
- **IMPORTANT**: Ensure `backend/media/images/` directory exists for uploads to work

### Security
- Never commit authentication tokens
- Use environment variables for sensitive data
- Validate user permissions on all API endpoints
- Sanitize content to prevent XSS attacks

## Troubleshooting Commands

### Check Database State
```bash
# Check all notes and blocks (hard deletion - no deleted items)
python manage.py shell -c "
from apps.notes.models import Note
from apps.blocks.models import Block
from django.contrib.auth.models import User

user = User.objects.get(username='testuser')
print('=== ALL NOTES ===')
all_notes = Note.objects.filter(owner=user)
for note in all_notes:
    print(f'{note.title}: {note.id}')

print('\\n=== COUNTS ===')
print('Total notes:', Note.objects.count())
print('User notes:', Note.objects.filter(owner=user).count())
print('Total blocks:', Block.objects.count())
print('User blocks:', Block.objects.filter(note__owner=user).count())
"
```

### Test API Authentication
```bash
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass123"}' http://localhost:8000/api/auth/token/ | jq -r '.token')
curl -H "Authorization: Token $TOKEN" http://localhost:8000/api/notes/
```

### Check Running Services
```bash
./start.sh status  # Use startup script to check status
ss -tlnp | grep -E "(3000|8000)"  # Check if both servers are running
ps aux | grep -E "(manage.py|react-scripts)"  # Check processes
```

### Debug API Field Mismatches
```bash
# Check what fields the API actually returns for notes list
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass123"}' http://localhost:8000/api/auth/token/ | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
curl -s -H "Authorization: Token $TOKEN" http://localhost:8000/api/notes/ | python3 -m json.tool

# Check individual note details (uses different serializer)
curl -s -H "Authorization: Token $TOKEN" http://localhost:8000/api/notes/<note_id>/ | python3 -m json.tool
```

## IMPORTANT Development Rules

1. **YOU MUST** always use optional chaining for `block.content` access
2. **YOU MUST** test both backend API and frontend integration after changes
3. **YOU MUST** handle authentication failures gracefully
4. **YOU MUST** validate user permissions in backend views
5. **YOU MUST** run both servers (Django + React) for full functionality testing - use `./start.sh`
6. **NEVER** commit hardcoded tokens or passwords
7. **ALWAYS** check console for errors when debugging block issues
8. **ALWAYS** activate virtual environment before running Django commands (or use start.sh)
9. **CRITICAL**: Deletion is HARD DELETE - items are permanently removed from database
10. **VERIFY** delete functionality by checking API responses and database counts
11. **USE** the start.sh script for development - it handles both servers and dependencies
12. **RESTART SERVERS** after backend changes using `./start.sh restart` to pick up new code
13. **CHECK MEDIA DIRECTORY** exists (`backend/media/images/`) for image uploads to work
14. **IMPORTANT**: When debugging image upload issues, add console.log statements to track the full flow from upload → onUpdate → handleBlockUpdate → API response
15. **CRITICAL**: In BlockSerializer, always check if updating existing instance vs creating new one - use `self.instance` to get current block data during PATCH operations
16. **IMPORTANT**: When debugging "invalid date" or similar frontend issues, check API field consistency between list and detail serializers - use debug commands to verify actual API response structure