# RTC Tool - Real-Time Collaborative Editor

A modern, real-time collaborative document editor built with Next.js, featuring live collaboration, version history, and advanced editing capabilities.

## 🚀 Features

- **Real-time Collaboration**: Multiple users can edit documents simultaneously
- **Live Cursor Tracking**: See where other users are editing in real-time
- **Version History**: Complete document versioning with restore capabilities
- **Persistent Undo/Redo**: Undo/redo operations persist across sessions
- **Export Options**: Export documents as JSON, TXT, or Word formats
- **Join/Leave Notifications**: Toast notifications for user presence
- **Authentication**: Secure user authentication with Clerk
- **Database Integration**: Persistent storage with Supabase
- **Responsive Design**: Works seamlessly across all devices

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Real-time**: Liveblocks for collaborative features
- **Editor**: Lexical rich text editor
- **Authentication**: Clerk
- **Database**: Supabase
- **UI Components**: Shadcn/ui

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PareshKondeti/RTC_Tool.git
   cd RTC_Tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # Liveblocks
   NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_public_key
   LIVEBLOCKS_SECRET_KEY=your_liveblocks_secret_key

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE=your_supabase_service_role_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

The application uses Supabase for data persistence. Set up the following tables:

### Documents Table
```sql
CREATE TABLE documents (
  room_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Document Versions Table
```sql
CREATE TABLE document_versions (
  id SERIAL PRIMARY KEY,
  room_id TEXT REFERENCES documents(room_id),
  version INTEGER NOT NULL,
  author_email TEXT NOT NULL,
  content_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Document Operations Table
```sql
CREATE TABLE document_ops (
  id SERIAL PRIMARY KEY,
  room_id TEXT REFERENCES documents(room_id),
  user_email TEXT NOT NULL,
  op_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Key Features Implementation

### Real-time Collaboration
- Built with Liveblocks for seamless real-time editing
- Live cursor tracking and user presence
- Conflict-free collaborative editing

### Version History
- Automatic document versioning
- Restore to any previous version
- Version comparison and management

### Persistent Undo/Redo
- Undo/redo operations saved to database
- Cross-session persistence
- Real-time undo/redo broadcasting

### Export Functionality
- Multiple export formats (JSON, TXT, Word)
- One-click document export
- Preserve formatting and structure

## 🔧 API Endpoints

- `POST /api/versions` - Save document version
- `GET /api/versions` - Retrieve document versions
- `POST /api/ops` - Save undo/redo operations
- `GET /api/ops` - Retrieve operations history

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile devices
- Various screen sizes

## 🚀 Deployment

The application can be deployed to:
- Vercel (recommended)
- Netlify
- Any Node.js hosting platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Paresh Kondeti**
- GitHub: [@PareshKondeti](https://github.com/PareshKondeti)
- Project: [RTC Tool](https://github.com/PareshKondeti/RTC_Tool)

---

Built with ❤️ using Next.js, Liveblocks, and modern web technologies.
