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
 - **Dynamic Imports**: Firebase SDK & AI/drag-drop modules loaded only when needed
 - **Bundle Decomposition**: Players feature split into shell vs. lazy heavy chunk reducing initial load ~33%
 - **Service Extraction**: Finance logic moved to `MatchFinanceService` minimizing component state
 - **AI Debounce & Caching**: Team composition hash prevents redundant analysis runs
 - **Environment-Gated Logging**: Production build excludes verbose dev logs
 - **Pagination Memoization**: Avoids slice/recalc until state changes
 - **AI Service Caching**: Single dynamic instance of `AIAnalysisService` reused (no repeated imports)
 - **Firebase Core Split**: Initialization separated into `FirebaseCoreService` reducing duplication and enabling future granular lazy loading of feature data listeners.
	- **Deferred Listeners**: History, Fund, and Statistics Firebase listeners now attach only when their lazy routes mount (reduces idle realtime overhead).
	- **Analysis Route Extraction**: `/analysis` lazy route hosts AI logic; players route no longer carries AI code unless explicitly loaded.
	- **Web Worker Offload**: Heavy AI computations moved to `ai-analysis.worker.ts` via `AIWorkerService`, keeping main thread responsive.
	- **Future Measurement**: Post-refactor bundle size measurement pending (`SIZE-ANALYSIS.md` will be updated after production build).
 - See `SIZE-ANALYSIS.md` for detailed size evolution and next optimization targets.

### 🚦 Phase 3 Enhancements (Runtime Flexibility & Performance Hardening)
Recent architectural improvements focused on reducing write amplification, enabling hot data backend switching, improving observability of performance, and strengthening test coverage.

#### 1. Unified Player Data Facade (Hot-Swappable Backend)
`PlayerDataFacade` now abstracts CRUD across Firebase Realtime Database and local file (`src/assets/players.json`). Switching modes no longer requires a reload; a runtime toggle (Admin Settings Panel) calls `setMode('firebase' | 'file')`, rebuilding subscriptions on-the-fly.

Benefits:
- Zero UI disruption when changing persistence layer
- Simplified mocking in tests (facade stub instead of Firebase internals)
- Offline-friendly development path (file mode + localStorage fallback)

#### 2. Caching Layer (`CacheService`)
Heavy analytics (team, player advanced, fund, comparison) are wrapped with a TTL memoization (default 15s) to avoid redundant recalculations on rapid successive emissions from reactive streams.

Usage pattern:
```ts
const stats = this.cache.wrap('teamAnalytics', 15000, () => this.teamAnalyticsService.calculate(...));
```
Invalidation occurs automatically after TTL or manually via `cache.clear()` (exposed in Admin Settings Panel for dev).

#### 3. Batched Firebase Statistics Sync
Previously, each granular stat update generated an immediate Firebase write. This caused write amplification and potential rate limiting.

Now, a Subject queues stat changes and emits a consolidated batch after a 30s debounce window:
```ts
pendingBatchSubject.next(partialStats);
```
The merged batch (with `batchType` metadata) is flushed via a single Firebase call, reducing network overhead dramatically under active match conditions.

Advantages:
- Fewer concurrent writes
- Reduced contention on realtime listeners
- Clear audit trail per batch

#### 4. Admin Settings Panel
New panel (restricted to admin roles) exposing runtime controls:
- Toggle Data Mode (Firebase ↔ File)
- Enable/Disable AI Analysis
- Export Full Analytics Snapshot (JSON download)
- Manual Flush (forces immediate batch sync)
- Clear Cache

This removes the need for environment rebuilds for common development toggles, accelerating iteration.

#### 5. Aggregated Analytics (`getAllAnalytics()`)
`StatisticsService` exposes a single method bundling all analytics domains (player, team, fund, comparison). Ideal for bulk export and snapshot views, internally leveraging caching to avoid fan-out recalculations.

#### 6. E2E Foundation (Playwright)
Added a lightweight smoke test ensuring the app renders and critical headings / navigation appear. Future scenarios will validate data mode switching and CRUD in both backends.

Run:
```powershell
npm run e2e
```

#### 7. Testing Modernization (Jest)
Converted service-level tests to Jest (ts-jest transform). Simplified configuration & improved developer feedback speed. Coverage enabled (currently ~80–90% on analytics services).

#### 8. Accessibility Improvements
Added ARIA roles (banner, navigation), live regions for loading / error states, labelled interactive elements, and improved keyboard semantics on players & header components.

#### 9. Performance Profiling
Script: `scripts/profile-performance.js` builds with `--stats-json` then prints human-readable bundle metrics (largest assets, total size). Helps target code-splitting & lazy loading candidates.

Run profiling:
```powershell
npm run profile
```
Sample output:
```
Building with stats-json...
Total JS assets: 1.42 MB (uncompressed)
Top 5 largest assets:
	main.[hash].js - 420 KB
	polyfills.[hash].js - 180 KB
	vendors.[hash].js - 610 KB
	players-feature.[hash].js - 130 KB
	analysis.[hash].js - 80 KB
Next Actions:
- Consider splitting vendors chunk (rxjs, firebase)
- Evaluate dynamic import of advanced analytics
```

#### 10. Developer Ergonomics
- Runtime toggles prevent rebuild loops
- Central analytics snapshot simplifies export + external tooling integration
- Explicit profiling path enforces performance culture

#### 11. Future Optimization Targets
- More granular Firebase listeners per feature route
- Async chunk prefetch hints (link rel="prefetch") for frequently navigated lazy modules
- Optional Web Worker migration for additional heavy calculations
- Extended E2E coverage across both data modes

> All Phase 3 core goals (facade, caching, batched sync, admin panel, profiling, accessibility) are implemented; documentation updated here. Remaining optional tasks tracked in project backlog.

### Data Mode Abstraction (Firebase vs. File CRUD)
The system now supports two interchangeable data persistence modes for player management, unified behind a facade pattern:

```
src/app/features/players/services/
├── player-data-facade.service.ts   # Decides active backend & exposes players$ + CRUD
├── file-player-crud.service.ts     # Local file + HTTP dev server CRUD (players.json)
└── firebase-player.service.ts      # Firebase Realtime Database CRUD
```

#### Facade Responsibilities
- Auto-selects data source based on `environment.features.fileCrud` (true = file mode, false = Firebase)
- Exposes a single observable `players$` for UI consumption
- Provides methods: `createPlayer(info)`, `updatePlayer(id, patch)`, `deletePlayer(id)`
- Offers `useFileMode` boolean & `getSnapshot()` for synchronous reads and UI badges

#### Running in File Mode (Local JSON Persistence)
File mode is ideal for rapid local development without a Firebase connection.

1. Ensure dev environment flag is set (already true in `environment.ts`):
	```ts
	export const environment = {
	  /* ... */
	  features: { fileCrud: true }
	}
	```
2. Start the Angular dev server (separate terminal):
	```powershell
	npm start
	```
3. Start the player file CRUD server (second terminal):
	```powershell
	npm run players:file:server
	```
4. CRUD operations now hit `scripts/players-file-server.js` endpoints manipulating `src/assets/players.json`.
5. If the server is unreachable, the facade falls back to a localStorage cache (read-only until connectivity restored).

#### Endpoints Exposed by Dev Server
| Method | Path              | Description                |
|--------|-------------------|----------------------------|
| GET    | /players          | Returns all players        |
| POST   | /players          | Creates a new player       |
| PUT    | /players/:id      | Updates an existing player |
| DELETE | /players/:id      | Removes a player           |

IDs auto-increment and are persisted in the JSON file. The server rewrites `players.json` on each mutating request.

#### Switching to Firebase Mode
Set the feature flag to false (or ensure production environment does so):
```ts
export const environment = {
  /* ... */
  features: { fileCrud: false }
}
```
No UI changes required—`PlayerDataFacade` routes calls to `FirebasePlayerService` seamlessly.

#### UI Indicators
`PlayersComponent` shows a badge derived from facade state:
```
[ Data Mode: FILE ]  or  [ Data Mode: FIREBASE ]
```
This makes it explicit which backend is currently powering the list.

#### Migration Notes
- Legacy direct injections of `FirebasePlayerService` have been replaced by the facade.
- `player-crud.service.ts` is deprecated; new code should use only `PlayerDataFacade`.
- The facade maintains a snapshot to avoid eager subscriptions when only a synchronous read is needed.

#### Advantages
- Hot-swappable persistence for faster iteration.
- Reduced coupling between UI and backend specifics.
- Simplified testing (mock facade instead of Firebase internals).
- Resilient offline development via localStorage fallback.

#### Future Enhancements (Planned)
- Add e2e tests for both modes.
- Provide a toggle switch in an admin settings panel to change mode at runtime (dev only).
- Integrate a diff/merge tool to push local file changes back into Firebase.

> NOTE: Ensure the file CRUD dev server is NOT deployed to production. It is strictly a development convenience.

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
