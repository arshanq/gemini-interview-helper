# Gemini Interview Helper

A stealth coding interview assistance application that captures active windows and provides AI-powered analysis using Google's Gemini API. Perfect for coding assessments and technical interviews.

## 🎯 Features

- **Smart Window Capture**: Automatically detects and captures the active Chrome/application window
- **AI-Powered Analysis**: Uses Google Gemini to analyze coding challenges and provide solutions
- **Stealth Mode**: Semi-transparent interface (70% opacity) ideal for screen sharing
- **Multi-Page Support**: Handle complex multi-part coding problems
- **Data Persistence**: Maintains conversation history when hiding/showing the window
- **Hotkey Controls**: All functionality accessible via keyboard shortcuts
- **Cross-Platform**: Works on macOS.

## 💻 Screen Sharing Compatibility

This application is designed to be invisible during screen sharing. It has been tested and works correctly with:

*   ✅ Amazon Chime
*   ✅ Google Meet

**Note:** There is a known issue where the application windows may still be visible when using **Zoom** due to its aggressive screen capture methods.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gemini-interview-helper
```

2. Install dependencies:
```bash
npm install
```

3. Configure your API key:
   - Copy `config.json.example` to `config.json`
   - Add your Google Gemini API key:
```json
{
  "apiKey": "your-gemini-api-key-here",
  "model": "gemini-2.5-flash"
}
```

4. Run the application:
```bash
npm start
```

## ⌨️ Hotkey Controls

| Hotkey | Function |
|--------|----------|
| `Ctrl+Shift+S` | Capture active window and get AI analysis |
| `Ctrl+Shift+A` | Multi-page mode (for complex problems) |
| `Ctrl+Shift+W` | Toggle between hidden and stealth mode |
| `Ctrl+Shift+R` | Reset/clear conversation |
| `Ctrl+Shift+Q` | Quit application |

## 🎭 Usage Modes

### Stealth Mode (Default)
- **70% opacity**: Clearly readable but subtle appearance
- **No taskbar presence**: Hidden from system UI
- **Frameless window**: No visible controls or borders

### Hidden Mode
- **Completely invisible**: Window is fully hidden
- **Use when needed**: Toggle with `Ctrl+Shift+W`
- **Data preserved**: All conversations maintained

## 🔧 Configuration

### API Settings
Edit `config.json` to customize:
```json
{
  "apiKey": "your-api-key",
  "model": "gemini-2.5-flash"
}
```

### Supported Models
- `gemini-2.5-flash` (default, fastest)

## 🖥️ System Requirements

### macOS
- **Screen Recording Permission**: Required for window capture
  - Go to System Preferences > Security & Privacy > Privacy > Screen Recording
  - Enable the ITerm or your terminal

## 🎯 Use Cases

### Coding Interviews
1. Start the app before beginning screen sharing
2. Use `Ctrl+Shift+S` to capture coding challenges
3. Read AI-generated solutions and explanations
4. Toggle visibility as needed with `Ctrl+Shift+W`

### Practice Sessions
- Use in visible mode for learning
- Analyze different coding patterns
- Build understanding of problem-solving approaches

## 🛠️ Technical Details

### Architecture
- **Electron**: Cross-platform desktop application framework
- **Node.js**: Backend processing and API integration
- **Google Gemini API**: AI analysis and solution generation
- **Native Screen Capture**: Platform-specific window detection

### Window Capture Technology
- **Electron desktopCapturer**: Primary capture method
- **active-win**: Smart window detection
- **Fallback methods**: Platform-specific screen capture utilities

### Security Features
- **No data logging**: Conversations are not stored permanently
- **Local processing**: All data stays on your machine
- **API-only communication**: Only sends images to Gemini API

## 🔍 Troubleshooting

### Common Issues

**"Screenshot failed" error:**
- Grant screen recording permissions (macOS)
- Ensure target window is visible and active
- Check that the application has proper system permissions

**Window not visible:**
- Press `Ctrl+Shift+W` to toggle visibility
- Check if window is positioned off-screen
- Restart the application

**API errors:**
- Verify your Gemini API key in `config.json`
- Check internet connection
- Ensure API quota is not exceeded

### Debug Mode
Run with debug logging:
```bash
DEBUG=* npm start
```

## 📝 Development

### Project Structure
```
├── main.js          # Main Electron process
├── index.html       # Renderer UI
├── config.json      # API configuration
├── package.json     # Dependencies
└── README.md        # Documentation
```

### Building
```bash
# Development
npm start
```

## 🙏 Credits

This project is based on the original work from [oa-coder](https://github.com/archangel0x01/oa-coder.git) by archangel0x01.

### Key Enhancements Made:
- **Advanced Window Detection**: Implemented Electron desktopCapturer with active-win for precise window targeting
- **Stealth Mode**: Added semi-transparent interface optimized for screen sharing
- **Data Persistence**: Enhanced conversation history management
- **Multi-Platform Support**: Improved cross-platform compatibility
- **Error Handling**: Robust fallback systems and user-friendly error messages
- **UI/UX Improvements**: Modern interface with better usability

### Original Features Retained:
- **Core Electron Framework**: Built upon the solid foundation
- **Hotkey System**: Enhanced the original keyboard shortcut system
- **AI Integration**: Expanded the original Gemini API implementation

## ⚠️ Disclaimer

This tool is designed for educational purposes and legitimate coding practice. Users are responsible for ensuring compliance with their organization's policies and any applicable terms of service when using this application during assessments or interviews.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request