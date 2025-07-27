const { app, BrowserWindow, globalShortcut, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const activeWin = require('active-win');

let config;
try {
  const configPath = path.join(__dirname, 'config.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configData);
  
  if (!config.apiKey) {
    throw new Error("API key is missing in config.json");
  }
  
  // Set default model if not specified
  if (!config.model) {
    config.model = "gemini-2.5-flash";
    console.log("Model not specified in config, using default:", config.model);
  }
} catch (err) {
  console.error("Error reading config:", err);
  app.quit();
}
const genAI = new GoogleGenerativeAI(config.apiKey);

let mainWindow;
let screenshots = [];
let multiPageMode = false;
let showWindow = true;
let stage = 0; // 0 = boot up stage, 1 = multi capture, 2 = AI Answered

// Define help message at the top level
const helpMessage = `## 👋 Welcome to Gemini Interview Helper!

Your AI-powered coding interview assistant is ready to help. This app runs in stealth mode (70% opacity) to stay subtle during screen sharing.

### 🎮 Available Commands:

**📸 Screenshot & Analysis:**
- \`Ctrl+Shift+S\` - Capture active window and get AI solution

**🎭 Window Control:**
- \`Ctrl+Shift+W\` - Toggle between hidden/visible modes
- \`Ctrl+Shift+R\` - Reset conversation and start fresh
- \`Ctrl+Shift+Q\` - Quit application

### 🚀 Quick Start:
1. Open your coding challenge in Chrome/browser
2. Press \`Ctrl+Shift+S\` to capture and analyze
3. Read the AI-generated solution and explanation

**Ready to assist with your coding interview! 🎯**`;

function updateInstruction(instruction) {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send('update-instruction', instruction);
  }
}

function hideInstruction() {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send('hide-instruction');
  }
}

async function captureActiveWindow() {
  try {
    console.log('Starting window capture using Electron desktopCapturer...');
    
    // Step 1: Get active window info using active-win
    let activeWindow;
    try {
      activeWindow = await activeWin();
      console.log('Active window info:', {
        title: activeWindow?.title,
        owner: activeWindow?.owner?.name,
        bounds: activeWindow?.bounds
      });
    } catch (activeWinError) {
      console.log('active-win failed:', activeWinError.message);
      activeWindow = null;
    }
    
    // Step 2: Get available desktop sources
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    console.log(`Found ${sources.length} desktop sources`);
    
    // Step 3: Find the target window source
    let targetSource = null;
    
    if (activeWindow) {
      // Try to match by window title and owner
      const activeTitle = activeWindow.title;
      const activeOwner = activeWindow.owner?.name;
      
      console.log(`Looking for window: "${activeTitle}" from "${activeOwner}"`);
      
      // First, try exact match
      targetSource = sources.find(source => {
        const isWindow = source.id.startsWith('window:');
        const titleMatch = source.name === activeTitle;
        const ownerMatch = activeOwner && source.name.includes(activeOwner);
        
        console.log(`Checking source: "${source.name}" (${source.id}) - titleMatch: ${titleMatch}, ownerMatch: ${ownerMatch}`);
        
        return isWindow && (titleMatch || ownerMatch);
      });
      
      // If no exact match, try partial match for Chrome specifically
      if (!targetSource && activeOwner) {
        targetSource = sources.find(source => {
          const isWindow = source.id.startsWith('window:');
          const nameContainsOwner = source.name.toLowerCase().includes(activeOwner.toLowerCase());
          const isNotMinimized = source.name !== '';
          
          return isWindow && nameContainsOwner && isNotMinimized;
        });
      }
    }
    
    // Step 4: Fallback to first non-empty window or screen
    if (!targetSource) {
      console.log('No matching window found, trying fallbacks...');
      
      // Try to find any Chrome window
      targetSource = sources.find(source => 
        source.id.startsWith('window:') && 
        source.name.toLowerCase().includes('chrome') &&
        source.name !== ''
      );
      
      // If still no Chrome, get the first non-empty window
      if (!targetSource) {
        targetSource = sources.find(source => 
          source.id.startsWith('window:') && 
          source.name !== '' &&
          !source.name.includes('Desktop')
        );
      }
      
      // Last resort: use entire screen
      if (!targetSource) {
        targetSource = sources.find(source => source.id.startsWith('screen:'));
      }
    }
    
    if (!targetSource) {
      throw new Error('No suitable capture source found');
    }
    
    console.log(`Selected source: "${targetSource.name}" (${targetSource.id})`);
    
    // Step 5: Send capture request to renderer process
    return new Promise((resolve, reject) => {
      const { ipcMain } = require('electron');
      
      // Set up one-time listener for the capture result
      const handleCaptureResult = (event, result) => {
        ipcMain.removeListener('capture-result', handleCaptureResult);
        ipcMain.removeListener('capture-error', handleCaptureError);
        
        if (result) {
          console.log('Successfully captured window using desktopCapturer');
          resolve(result);
        } else {
          reject(new Error('No capture result received'));
        }
      };
      
      const handleCaptureError = (event, error) => {
        ipcMain.removeListener('capture-result', handleCaptureResult);
        ipcMain.removeListener('capture-error', handleCaptureError);
        reject(new Error(error));
      };
      
      ipcMain.once('capture-result', handleCaptureResult);
      ipcMain.once('capture-error', handleCaptureError);
      
      // Send capture request to renderer
      mainWindow.webContents.send('capture-window', targetSource.id);
      
      // Set timeout
      setTimeout(() => {
        ipcMain.removeListener('capture-result', handleCaptureResult);
        ipcMain.removeListener('capture-error', handleCaptureError);
        reject(new Error('Capture timeout'));
      }, 10000);
    });
    
  } catch (error) {
    console.error('Electron desktopCapturer failed:', error);
    
    // Fallback to original screencapture method
    console.log('Falling back to screencapture method...');
    const execPromise = util.promisify(exec);
    const timestamp = Date.now();
    const imagePath = path.join(app.getPath('pictures'), `screenshot_${timestamp}.png`);
    
    try {
      if (process.platform === 'darwin') {
        await execPromise(`screencapture ${imagePath}`);
      } else if (process.platform === 'win32') {
        const psScript = `
          Add-Type -AssemblyName System.Windows.Forms
          Add-Type -AssemblyName System.Drawing
          $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
          $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
          $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
          $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
          $bitmap.Save("${imagePath}")
          $graphics.Dispose()
          $bitmap.Dispose()
        `;
        await execPromise(`powershell -command "${psScript}"`);
      } else {
        throw new Error('Platform not supported');
      }
      
      if (!fs.existsSync(imagePath)) {
        throw new Error('Screenshot file was not created');
      }
      
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Clean up
      try {
        fs.unlinkSync(imagePath);
      } catch (cleanupError) {
        console.warn('Could not clean up temporary screenshot file:', cleanupError);
      }
      
      return imageBuffer.toString('base64');
    } catch (fallbackError) {
      console.error('Fallback capture also failed:', fallbackError);
      throw new Error('All capture methods failed. Please check system permissions.');
    }
  }
}

async function captureScreenshot() {
  try {
    hideInstruction();
    mainWindow.hide();
    await new Promise(res => setTimeout(res, 200));

    const base64Image = await captureActiveWindow();

    mainWindow.show();
    return base64Image;
  } catch (err) {
    mainWindow.show();
    if (mainWindow.webContents) {
      const errorMessage = `Screenshot failed: ${err.message}. Make sure you have an active window selected.`;
      mainWindow.webContents.send('error', errorMessage);
    }
    throw err;
  }
}

function showMainWindow() {
  mainWindow.show();
  if (stage == 2) {
    // If we're in stage 2 (AI has responded), restore the overlay with previous content
    mainWindow.webContents.send('show-app');
  } else if (stage == 1) {
    // If we're in multi-page mode, restore the instruction
    updateInstruction("Multi-mode: Ctrl+Shift+A to add, Ctrl+Shift+S to finalize");
  } else {
    // Stage 0 - show initial instruction
    updateInstruction("Ctrl+Shift+S: Screenshot | Ctrl+Shift+A: Multi-mode | Ctrl+Shift+W: Hide Window | Ctrl+Shift+Q: Close");
  }
  showWindow = true;
}

function hideMainWindow() {
  mainWindow.webContents.send('hide-app');
  mainWindow.hide();
  showWindow = false;
}

async function processScreenshots() {
  try {
    const model = genAI.getGenerativeModel({ model: config.model });

    const prompt = "Please analyze this coding challenge and provide a solution with explanation:";

    const imageParts = screenshots.map(img => ({
      inlineData: {
        data: img,
        mimeType: 'image/png'
      }
    }));

    mainWindow.webContents.send('show-chat', { prompt, image: screenshots[0] });

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Send the analysis result to both chat and response overlay
    mainWindow.webContents.send('analysis-result', text);
    
    // Also store it in the response overlay for when window is hidden/shown
    mainWindow.webContents.send('store-response', text);
    
    stage = 2;
  } catch (err) {
    console.error("Error in processScreenshots:", err);
    if (mainWindow.webContents) {
      mainWindow.webContents.send('error', err.message);
    }
  }
}

function resetProcess() {
  screenshots = [];
  multiPageMode = false;
  mainWindow.webContents.send('clear-result');
  updateInstruction("Ctrl+Shift+S: Screenshot | Ctrl+Shift+A: Multi-mode | Ctrl+Shift+W: Hide Window | Ctrl+Shift+Q: Close");
  stage = 0;
}

function createWindow() {
  stage = 0;
  
  // Get screen dimensions to calculate 40% of screen size
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Calculate window size as 40% of screen
  const windowWidth = Math.floor(screenWidth * 0.4);
  const windowHeight = Math.floor(screenHeight * 0.6);
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false // Allow access to desktop capture
    },
    frame: false, // Remove frame completely
    transparent: true, // Enable transparency for stealth
    alwaysOnTop: false, // Changed to false to avoid screen sharing detection
    paintWhenInitiallyHidden: true,
    resizable: false, // Fixed size to avoid detection
    movable: true, // Keep movable for positioning
    skipTaskbar: true, // Hide from taskbar
    show: false, // Start hidden
    titleBarStyle: 'hidden', // Ensure title bar is hidden
    trafficLightPosition: { x: -100, y: -100 }, // Move traffic lights off-screen
    hasShadow: false, // Remove window shadow
    thickFrame: false, // Remove thick frame on Windows
    acceptFirstMouse: true, // Don't require click to focus
    disableAutoHideCursor: true, // Keep cursor visible
    useContentSize: true, // Use content size instead of window size
    kiosk: false, // Ensure not in kiosk mode
    fullscreen: false, // Ensure not fullscreen
    simpleFullscreen: false, // Disable simple fullscreen
    enableLargerThanScreen: false, // Don't allow larger than screen
    opacity: 0.7 // Readable but subtle for stealth mode
  });

  // Ctrl+Shift+S => single or final screenshot
  globalShortcut.register('CommandOrControl+Shift+S', async () => {
    // Clear any previous help message when taking first screenshot
    if (stage === 0) {
      mainWindow.webContents.send('clear-result');
    }

    try {
      const img = await captureScreenshot();
      mainWindow.show();
      screenshots.push(img);
      await processScreenshots();
    } catch (error) {
      console.error("Ctrl+Shift+S error:", error);
    }
  });

  // Ctrl+Shift+A => multi-page mode
  globalShortcut.register('CommandOrControl+Shift+A', async () => {
    // Clear any previous help message when starting multi-page mode
    if (stage === 0) {
      mainWindow.webContents.send('clear-result');
    }

    try {
      if (!multiPageMode) {
        multiPageMode = true;
        updateInstruction("Multi-mode: Ctrl+Shift+A to add, Ctrl+Shift+S to finalize");
      }
      mainWindow.show();
      const img = await captureScreenshot();
      screenshots.push(img);
      updateInstruction("Multi-mode: Ctrl+Shift+A to add, Ctrl+Shift+S to finalize");
      stage = 1;
    } catch (error) {
      console.error("Ctrl+Shift+A error:", error);
    }
  });

  // Ctrl+Shift+R => reset
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    resetProcess();
  });

  // Ctrl+Shift+W => Toggle between hidden and visible (stealth mode)
  globalShortcut.register('CommandOrControl+Shift+W', () => {
    if (showWindow) {
      // Currently visible → Hide completely
      hideMainWindow();
      console.log("Window hidden completely");
    } else {
      // Currently hidden → Show in stealth mode (low opacity)
      showMainWindow();
      console.log("Window visible in stealth mode");
    }
  });
     
  // Ctrl+Shift+Q => Quit the application
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    console.log("Quitting application...");
    app.quit();
  });

  mainWindow.loadFile('index.html');
  mainWindow.setContentProtection(true);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
}

app.whenReady().then(() => {
  createWindow();
  // Show initial help message after window is created
  setTimeout(() => {
    mainWindow.webContents.send('show-help', helpMessage);
  }, 1000);
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
