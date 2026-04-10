# Track&Trail | Job Application Tracker

Track&Trail is a polished, full-stack job application tracker designed to help you stay organized during your career search. It provides a comprehensive dashboard, real-time tracking, and contact management, all wrapped in a modern, mobile-responsive interface.

## 🚀 Features

- **Dynamic Dashboard**: Get a bird's-eye view of your search with counters for Active Apps, Interviews, Offers, and more.
- **Activity Visualization**: Side-by-side bar charts showing your application and networking momentum over the last 6 weeks.
- **Application Management**: Track every detail of your job hunt, including status history, URLs, and notes.
- **Contact Tracking**: Keep a record of recruiters, hiring managers, and networking contacts.
- **Mobile-First Design**: Features a floating bottom navigation bar for a native-app feel on mobile devices.
- **Data Portability**: Easily export your entire search history to a ZIP file or import existing data.
- **Secure Authentication**: Powered by Firebase Google Auth.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Firebase (Firestore & Authentication)
- **Animations**: Framer Motion (`motion/react`)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns

## ⚙️ Setup & Configuration

### Environment Variables

To run this application, you need to configure your Firebase project. Create a `.env` file in the root directory (or use the Secrets panel in AI Studio) with the following variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=your_database_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## 🔒 Security

This project is configured to keep your API keys safe:
- `firebase-applet-config.json` is ignored by Git.
- Sensitive configuration is handled via `VITE_` environment variables.
- Firestore Security Rules are implemented to ensure users can only access their own data.

## 📱 Mobile Experience

Track&Trail is optimized for Safari and mobile browsers. On iOS, you can "Add to Home Screen" to use it as a standalone web app with a custom briefcase icon.

---
Built with ❤️ using Google AI Studio.
