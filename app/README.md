# Who Wants to be a Millionaire - Interactive Game Show

A fully-featured, cinematic web application for hosting "Who Wants to be a Millionaire" game sessions with stunning visual effects, immersive sound design, and interactive lifelines.

## 🎮 Features

### Game Modes
- **Classic Mode**: 15 ascending difficulty questions with prize ladder
- **Fastest Finger First**: Multiplayer ordering questions with QR code joining
- **Custom Game Builder**: Create your own question packs via CSV upload

### Lifelines
- **50:50**: Removes 2 wrong answers (visual strikethrough effect)
- **Ask the Audience**: Shows animated voting bars in a popup dialog
- **Phone a Friend**: 60-second countdown with friend's advice in popup

### Audio & Visual Effects
- Level-appropriate background music (intensity increases with prize levels)
- Sound effects for correct/wrong answers, lifelines, and game events
- Lightning flash effects on correct answers
- Green pulsing animations for correct answers
- Red shake animations for wrong answers
- Animated prize ladder with glow effects
- Sweeping light beams across the screen

## 🚀 Quick Start

### Prerequisites
- Python 3 (included on macOS and most Linux systems)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Running the App

1. **Start the local server:**
   ```bash
   cd /Users/ismaila/Documents/C-Codes/WWTBAM
   python3 -m http.server 8080 --directory app
   ```

2. **Open your browser:**
   Navigate to [http://localhost:8080](http://localhost:8080)

3. **Enable Sound:**
   Click the 🔇 button in the top-right corner to enable audio (browsers require user interaction before playing sounds)

## 🎯 How to Play

### Quick Play (Default Pack)
1. Click **"Play Default Pack"** on the landing page
2. The game starts immediately with pre-loaded trivia questions
3. Click **"Open Classic Board"** to begin answering questions

### Using Lifelines

#### 50:50
- Click the **"50:50"** button
- Two wrong answers will be visually disabled (strikethrough, faded)
- Choose from the remaining two options

#### Ask the Audience
- Click **"Ask the Audience"**
- A popup appears showing animated voting bars
- Percentages reflect audience confidence (higher at lower levels)
- Higher difficulty questions have less reliable audience votes

#### Phone a Friend
- Click **"Phone a Friend"**
- Popup shows 60-second countdown with pulsing animation
- After 5 seconds, friend's advice appears
- Confidence percentage decreases on harder questions
- Phone sound effect plays during the lifeline

### Game Flow
1. Read the question (displayed in highlighted card)
2. Optionally use a lifeline
3. Select your answer by clicking A, B, C, or D
4. Watch the animation:
   - **Correct**: Green pulsing + lightning flash + celebration sound
   - **Wrong**: Red shaking + failure sound + correct answer revealed
5. Progress to next level or see final results

## 📁 Project Structure

```
WWTBAM/
├── app/
│   ├── index.html          # Main HTML structure
│   ├── styles.css          # All styling and animations
│   ├── app.mjs             # Core game logic
│   ├── audio.mjs           # Audio manager (sounds & music)
│   ├── data.mjs            # Default question pack
│   └── utils.mjs           # Helper functions
├── wwtbam_audios/          # Sound effects and music files
│   ├── main-theme.mp3
│   ├── correct-answer.mp3
│   ├── wrong-answer.mp3
│   ├── phone-a-friend.mp3
│   └── ... (more audio files)
├── package.json            # NPM configuration
└── README.md              # This file
```

## 🎨 Customization

### Creating Custom Question Packs

1. **Click "Creator Dashboard"**
2. **Click "Create Pack"**
3. **Fill in details:**
   - Pack Title
   - Description
   - Currency Symbol
   - Prize Ladder (15 levels)
   - Lifeline Names (optional customization)

4. **Upload CSV file** with this format:

```csv
level,question,A,B,C,D,correct,explanation
1,What is 2+2?,2,3,4,5,C,Basic arithmetic
2,Capital of France?,London,Berlin,Paris,Rome,C,Paris is the capital
...
```

**CSV Requirements:**
- Exactly 15 rows (one for each level)
- Columns: `level`, `question`, `A`, `B`, `C`, `D`, `correct`, `explanation` (optional)
- `correct` must be A, B, C, or D
- Levels 1-15 must all be present

## 🎵 Audio System

### Background Music
Music changes automatically based on prize level:
- **Levels 1-5**: Light tension (100-1000 range)
- **Levels 6-10**: Moderate tension (2000-32000)
- **Levels 11-12**: High tension (64000)
- **Levels 13-14**: Extreme tension (250000)
- **Level 15**: Final question music (1000000)

### Sound Effects
- Main theme (landing page)
- "Let's Play!" (game start)
- Correct answer (with lightning)
- Wrong answer
- Final answer lock-in
- Fastest Finger First
- Phone a Friend countdown
- Commercial break (walk away)

### Troubleshooting Audio
If sounds don't play:
1. **Click the sound button** to unmute
2. **Check browser console** for errors (F12 → Console tab)
3. **Verify audio files** exist in `wwtbam_audios/` folder
4. **Check browser permissions** (some browsers block autoplay)
5. **Try another browser** (Chrome recommended)

## 🎨 Visual Features

### Animations
- **correctPulse**: Green glowing pulse (3 cycles) on correct answers
- **wrongShake**: Red horizontal shake on wrong answers
- **lightningFlash**: Screen flash effect for celebrations
- **beamSweep**: Continuous sweeping light effects
- **ladderReveal**: Staggered animation for prize ladder items
- **suspensePulse**: Breathing effect for timers and suspense moments

### Color Scheme
- **Primary Accent**: Golden (#f6b93b)
- **Success**: Green (#34d399)
- **Danger**: Red (#f87171)
- **Background**: Dark blue gradient
- **Text**: Light gray (#f3f4f8)

## 🔧 Technical Details

### Browser Compatibility
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

### Technologies Used
- **HTML5**: Semantic structure, dialog elements
- **CSS3**: Animations, gradients, backdrop-filter
- **JavaScript ES6**: Modules, async/await, classes
- **Web Audio API**: Sound management
- **LocalStorage**: Session and pack persistence

### Performance
- Optimized animations with GPU acceleration
- Lazy-loaded audio files
- Efficient re-rendering of game state
- Smooth 60fps animations

## 🐛 Known Issues & Solutions

### Issue: Audio doesn't play
**Solution**: Click the 🔇 button to enable sound. Browsers require user interaction before playing audio.

### Issue: 50:50 doesn't remove options
**Solution**: Options are disabled (strikethrough, faded) but remain visible. This is intentional - they show which options were eliminated.

### Issue: CSV import fails
**Solution**: Ensure your CSV has exactly 15 rows with all required columns. Use the example format above.

## 📝 Future Enhancements

The app is designed with Firebase integration in mind:
- Real-time multiplayer sessions
- Cloud-stored question packs
- Leaderboards and analytics
- User authentication
- Social sharing

## 📄 License

This project is for educational and demonstration purposes.

## 🙏 Credits

- Game concept: Original "Who Wants to be a Millionaire" TV show
- Design inspiration: Modern web design patterns
- Audio: Licensed sound effects (ensure proper licensing for production use)

---

**Built with ❤️ for interactive learning and entertainment**

For issues or questions, check the browser console (F12) for detailed error messages.
