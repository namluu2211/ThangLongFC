# ⚽ Thăng Long FC - Mia Professional Football Club Management System

## 🚀 Overview

**Thăng Long FC** is a comprehensive Angular-based football club management system designed for local football clubs to manage players, matches, finances, and statistics. The application has evolved from a simple skeleton into a professional-grade system with advanced core services and AI-powered features.

## ✨ Key Features

### 🧑‍🤝‍🧑 **Player Management**
- Complete player profiles with avatars and statistics
- AI-powered team balancing algorithms
- Performance tracking and analytics
- Position management and skill assessments
- Drag-and-drop team formation interface

### ⚽ **Match Management**
- Comprehensive match creation and tracking
- Real-time score updates and match events
- Automatic financial calculations
- Goal, assist, and card tracking
- Match result analysis and reporting

### 💰 **Financial Management**
- Real-time fund tracking and monitoring
- Automatic revenue calculations (winner/loser fees, penalties)
- Detailed expense management (referee, field, water, etc.)
- Profit/loss analysis and reporting
- Financial timeline visualization

### 📊 **Advanced Statistics & Analytics**
- AI-powered player performance analysis
- Team composition recommendations
- Monthly and yearly comparison reports
- Predictive team balancing
- Comprehensive financial analytics
- Performance trend analysis

### 📋 **Match History**
- Complete match archive with search and filtering
- Editable match data (admin only)
- Financial breakdown for each match
- Export capabilities for data backup
- Firebase synchronization with offline support

## 🏗️ Architecture

### Core Services Layer
```
src/app/core/services/
├── player.service.ts      # Player CRUD, team balancing, analytics (864 lines)
├── match.service.ts       # Match management, financial calculations (996 lines)
├── data-store.service.ts  # State management, fund tracking (674 lines)
└── statistics.service.ts  # Advanced analytics, AI/ML features (1092 lines)
```

### Component Architecture
```
src/app/features/
├── players/               # Enhanced player management with AI features
├── match-info/           # Comprehensive match creation and tracking
├── stats/                # Advanced analytics dashboard (2500+ lines)
├── history/              # Enhanced match history with financial analytics
└── fund/                 # Integrated fund management
```

### Data Models
```
src/app/core/models/
├── player.model.ts       # PlayerInfo, PlayerStats interfaces
├── match.model.ts        # MatchInfo, MatchFinances, MatchResult interfaces
└── statistics.model.ts   # Analytics and reporting interfaces
```

## 👥 User Roles & Authentication
- **NamLuu** (Super Admin) - Full system access and configuration
- **SyNguyen** (Admin) - Match and player management
- **Users** - View-only access to statistics and history

Authentication uses SHA-256 hashed passwords with role-based access control.

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Angular CLI (v17+)
- Firebase account (for cloud storage)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd ThangLongFC

# Install dependencies
npm install

# Start development server
npm start
```

### Environment Configuration
Create a `.env` file in the root directory:
```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Application Settings
APP_VERSION=2.0.0
APP_ENVIRONMENT=development
```

## 🚀 **Build Commands**

| Command | Description | Environment |
|---------|-------------|-------------|
| `npm start` | Development server | Development with .env |
| `npm run build` | Production build | Production optimized |
| `npm run build:env` | Development build | Development with .env |
| `npm run build:env:prod` | Production build | Production with .env |
| `npm run deploy` | Deploy to production | Automated deployment |
| `npm test` | Run unit tests | Test environment |
| `npm run lint` | Code linting | Any |

### Accessing the Application
1. Start the development server: `npm start`
2. Open your browser to `http://localhost:4200`
3. Login with admin credentials to access management features

## 💾 Data Storage

### Multi-layer Storage Architecture
- **Primary**: Firebase Firestore (cloud storage with real-time sync)
- **Secondary**: localStorage (offline support and backup)
- **Cache**: In-memory caching with intelligent invalidation

### Data Types Managed
- Player profiles and statistics
- Match records and financial data
- Fund transactions and balance history
- User authentication and permissions
- System configuration and settings

## 🎯 User Guide

### For Players & Viewers
1. **View Statistics**: Check the Stats tab for performance insights
2. **Match History**: Review past matches and results
3. **Player Rankings**: See top performers and statistics

### For Admins
1. **Manage Players**: Add/edit/remove players from the team
2. **Create Matches**: Set up new matches with team selection
3. **Financial Tracking**: Monitor club finances and expenses
4. **Data Management**: Export/import data and manage backups

### For Super Admins
1. **System Configuration**: Manage rates, settings, and rules
2. **User Management**: Add/remove admin users
3. **Data Synchronization**: Sync between local and cloud storage
4. **Advanced Analytics**: Access AI-powered insights and predictions

## 🔧 Technical Features

### Performance Optimizations
- **Reactive Programming**: RxJS-based data flow
- **Intelligent Caching**: Memoization and cache management
- **Lazy Loading**: On-demand component loading
- **Change Detection**: Optimized Angular change detection strategy

### AI & Machine Learning
- **Team Balancing**: AI-powered team formation recommendations
- **Performance Prediction**: Player performance forecasting
- **Financial Analytics**: Automated insights and trend analysis
- **Pattern Recognition**: Match outcome predictions

### Responsive Design
- Mobile-first approach with responsive layouts
- Touch-friendly interface for tablets and phones
- Progressive Web App (PWA) capabilities
- Offline functionality with data synchronization

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run e2e

# Run linting
npm run lint

# Check test coverage
npm run test:coverage
```

## 📱 Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Security Features
- Role-based access control (RBAC)
- SHA-256 password hashing
- Firebase authentication integration
- Data validation and sanitization
- Audit trail for admin actions

## 🚀 Deployment

### Production Deployment
```bash
# Build for production
npm run build:env:prod

# Deploy to hosting platform
npm run deploy
```

### Supported Platforms
- Firebase Hosting
- Netlify
- Vercel
- Traditional web servers

## 📈 Roadmap

### Upcoming Features
- [ ] Mobile application (React Native)
- [ ] Advanced reporting dashboard
- [ ] Tournament management system
- [ ] Integration with external APIs
- [ ] Multi-language support
- [ ] Advanced AI coaching recommendations

### Version History
- **v2.0.0** - Core services integration, AI features, enhanced analytics
- **v1.5.0** - Firebase integration, improved UI/UX
- **v1.0.0** - Initial release with basic functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

---

**Thăng Long FC** - Empowering local football clubs with professional-grade management tools! ⚽🏆
