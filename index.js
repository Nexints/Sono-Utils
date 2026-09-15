/*
This specific launcher is open-source, but the Sonolus Server is governed under the Nexint TOS.
Sono-Overlay is under the AGPL-v3.
This program is simply a wrapper that makes calling Sono-Overlay easier for the user,
as well as unifies all Sonolus utilities into one megapackage.
*/

const { spawn, execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { release } = require('os');

const MENU_ITEMS = [
  'Launch Sonolus Server',
  'Launch Sono-Overlay',
  'Launch YT-DLP wrapper',
  'Update All Subsystems', // Added Update Option
  'Credits',
  'Disclaimers',
  'Exit Launcher'
];

let selectedIndex = 0;
let activeChildStdin = null;

// Define the process directory
// Just to sync up the process of making a new directory.
try {
  process.chdir(__dirname);
  console.log(`New directory: ${process.cwd()}`);
} catch (err) {
  console.error(`Error changing directory: ${err}`);
}

function onRawConsoleDataInput(chunk) {
  if (activeChildStdin && activeChildStdin.writable) {
    activeChildStdin.write(chunk);
    return;
  }

  const key = chunk.toString();

  if (key === '\u001b[A' || key === '\u001bOA') {
    selectedIndex = (selectedIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
    renderMenu();
  } else if (key === '\u001b[B' || key === '\u001bOB') {
    selectedIndex = (selectedIndex + 1) % MENU_ITEMS.length;
    renderMenu();
  } else if (key === '\r' || key === '\n') {
    handleSelection(MENU_ITEMS[selectedIndex]);
  } else if (key === '\u0003') {
    process.exit(0);
  }
}

function initMenuInputEngine() {
  activeChildStdin = null;
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.removeListener('data', onRawConsoleDataInput);
  process.stdin.on('data', onRawConsoleDataInput);
}

function executeIsolatedProcess(command, processArgs, label, options = {}, onDoneCallback) {
  console.log(`--- Starting the Sonolus Server --\n`);

  const child = spawn(command, processArgs, {
    stdio: ['pipe', 'inherit', 'inherit'],
    ...options
  });

  activeChildStdin = child.stdin;

  child.on('close', (code) => {
    activeChildStdin = null;
    onDoneCallback(code);
  });

  child.on('error', (err) => {
    console.error(`\x1b[31m[Spawn Error]: ${err.message}\x1b[0m\n`);
    activeChildStdin = null;
    onDoneCallback(1);
  });
}

function handleSelection(label) {
  process.stdout.write('\x1b[2J\x1b[0;0H');
  const workingDir = process.pkg ? path.dirname(process.execPath) : __dirname;

  const dir = path.join(workingDir, 'server');

  if (label === 'Exit Launcher') process.exit(0);
  if (label === 'Update All Subsystems') {
    const allTools = ['sono-server', 'sono-overlay', 'yt-dlp', 'ffmpeg', 'ffprobe'];
    console.log(`\x1b[95m--- Initializing Global System Update Loop ---\x1b[0m\n`);

    const triggerSequentialUpdate = (index) => {
      if (index >= allTools.length) {
        console.log(`\x1b[32m[Success]: All core systems up to date!\x1b[0m\n`);
        returnToMenu();
        return;
      }
      // Pass 'true' to force download and overwrite local files
      verifyAssetDependency(workingDir, allTools[index], () => {
        triggerSequentialUpdate(index + 1);
      }, true);
    };

    triggerSequentialUpdate(0);
    return;
  }

  if (label === 'Launch YT-DLP wrapper') {
    const dependencies = ['yt-dlp', 'ffmpeg', 'ffprobe'];
    
    const runNextDependencyCheck = (index) => {
      if (index >= dependencies.length) {
        process.stdin.removeListener('data', onRawConsoleDataInput);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        runMediaDownloader(workingDir);
        return;
      }
      
      // Default to false (only downloads if missing)
      verifyAssetDependency(workingDir, dependencies[index], () => {
        runNextDependencyCheck(index + 1);
      }, false);
    };

    runNextDependencyCheck(0);
    return;
  }

  if (label === 'Credits') {
    console.log(`--- Credits: ---\n`);
    console.log("- This Wrapper: @Nexint");
    console.log("- Sonolus Server: @Nexint");
    console.log("- Sono-Overlay: @Nexint, forked from @TootieJin");
    console.log("- YT-DLP: Various Coders");
    console.log("");
    console.log("The goal of this project is to provide an easy to use manual for ALL of your charting needs!");
    console.log("- SonoUtils (the wrapper) is licensed under the Apache 2.0");
    console.log("- Sono-Overlay is under the AGPL");
    console.log("- YT-DLP is under the Unlicense");
    console.log("- ProSeka Faithful and Sono-Server is under the Nexint TOS");
    console.log("");
    console.log("Nexint TOS is mentioned here https://nexint.ca/tos");
    returnToMenu();
  }

  if (label === 'Disclaimers') {
    console.log(`--- Disclaimers: ---\n`);
    console.log("- This project was partially coded by AI.");
    console.log("- However, not all of the project is AI coded (obviously),");
    console.log("- and I aim to use AI responsibly.");
    console.log("");
    console.log("This project remains compliant with the AGPL by acting as a mere aggregator.");
    console.log("SonoUtils only acts as a launcher for various independent applets.");
    console.log("Sono-Overlay (AGPL) is downloaded on the fly.")
    console.log("Have fun when using this tool! This tool remains fully open source, so you can audit the tool yourself.");
    returnToMenu();
  }

  if (label === 'Launch Sonolus Server') {
    verifyAssetDependency(workingDir, 'sono-server', () => {
      const startWizard = () => {
        const wizardPath = path.join(dir, 'install.js');

        executeIsolatedProcess('node', [wizardPath], label, { cwd: dir }, (code) => {
          returnToMenu();
        });
      };

      if (!fs.existsSync(path.join(dir, 'node_modules'))) {
        console.log(`--- Installing Server Dependencies ---\n`);
        executeIsolatedProcess('npm', ['install'], 'Server Dependencies (npm install)', { cwd: dir, shell: true }, (code) => {
          if (code === 0) startWizard();
          else {
            console.error('\x1b[31mError: npm install failed. Aborting workspace execution.\x1b[0m\n');
            returnToMenu();
          }
        });
      } else {
        startWizard();
      }
    }, false);
    return;
  } else if (label === 'Launch Sono-Overlay') {
    const overlayDir = path.join(workingDir, 'Sono-Overlay');
    const binaryName = process.platform === 'win32' ? 'sono-overlay.exe' : 'sono-overlay';
    const overlayPath = path.join(overlayDir, binaryName);

    // Call the dynamic loader passing false so it runs instantly if present
    verifyAssetDependency(workingDir, 'sono-overlay', () => {
      startSonoOverlayProcess(overlayDir, overlayPath);
    }, false);
    return;
  }
}

// Hardened, production-ready configuration dependency router
function verifyAssetDependency(workingDir, assetKey, onReadyCallback, forceDownload = false) {
  const addonsDir = path.join(workingDir, 'addons');
  const overlayDir = path.join(workingDir, 'Sono-Overlay');
  const serverDir = path.join(workingDir, 'server');
  const isWin = process.platform === 'win32';
  
  const ASSET_MANIFESTS = {
    'sono-server': {
      repo: 'Nexints/Sono-Server',
      binary: 'install.js',
      targetDir: serverDir,
      getPattern: () => '.zip',
      extract: (tmp, dest) => {
        console.log(`Extraction in progress...`);
        if (isWin) {
          execSync(`powershell -Command "Expand-Archive -Path '${tmp}' -DestinationPath '${serverDir}' -Force"`);
        } else {
          try {
            execSync(`unzip -v`, { stdio: 'ignore' });
            execSync(`unzip -o "${tmp}" -d "${serverDir}"`);
          } catch (e) {
            throw new Error("Missing system dependency: 'unzip' utility is required on this system profile. Please install it.");
          }
        }
      }
    },
    'sono-overlay': {
      repo: 'Nexints/Sono-Overlay',
      binary: isWin ? 'sono-overlay.exe' : 'sono-overlay',
      targetDir: overlayDir,
      getPattern: () => '.zip',
      extract: (tmp, dest) => {
        console.log(`Extraction in progress...`);
        if (isWin) {
          execSync(`powershell -Command "Expand-Archive -Path '${tmp}' -DestinationPath '${overlayDir}' -Force"`);
        } else {
          // Safeguard: Verify system zip capability before spawning process loops
          try {
            execSync(`unzip -v`, { stdio: 'ignore' });
            execSync(`unzip -o "${tmp}" -d "${overlayDir}"`);
          } catch (e) {
            throw new Error("Missing system dependency: 'unzip' utility is required on this system profile. Please install it.");
          }
        }
      }
    },
    'yt-dlp': {
      repo: 'yt-dlp/yt-dlp',
      binary: isWin ? 'yt-dlp.exe' : 'yt-dlp',
      targetDir: addonsDir,
      getPattern: (bin) => bin,
      extract: (tmp, dest) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        fs.renameSync(tmp, dest);
      }
    },
    'ffmpeg': {
      repo: 'yt-dlp/FFmpeg-Builds',
      binary: isWin ? 'ffmpeg.exe' : 'ffmpeg',
      targetDir: addonsDir,
      getPattern: () => isWin ? 'ffmpeg-master-latest-win64-gpl.zip' : (process.platform === 'linux' ? 'ffmpeg-master-latest-linux64-gpl.tar.xz' : 'ffmpeg-master-latest-macos64-gpl.tar.xz'),
      extract: (tmp, dest, bin) => extractArchivedSubcomponent(tmp, addonsDir, dest, bin, 'ffmpeg')
    },
    'ffprobe': {
      repo: 'yt-dlp/FFmpeg-Builds',
      binary: isWin ? 'ffprobe.exe' : 'ffprobe',
      targetDir: addonsDir,
      getPattern: () => isWin ? 'ffmpeg-master-latest-win64-gpl.zip' : (process.platform === 'linux' ? 'ffmpeg-master-latest-linux64-gpl.tar.xz' : 'ffmpeg-master-latest-macos64-gpl.tar.xz'),
      extract: (tmp, dest, bin) => extractArchivedSubcomponent(tmp, addonsDir, dest, bin, 'ffprobe')
    }
  };

  const manifest = ASSET_MANIFESTS[assetKey];
  const targetPath = path.join(manifest.targetDir, manifest.binary);

  if (fs.existsSync(targetPath) && !forceDownload) {
    onReadyCallback();
    return;
  }

  console.log(`\x1b[33m[Notice]: ${forceDownload ? 'Updating' : 'Missing'} ${assetKey.toUpperCase()} component. Reaching GitHub API...\x1b[0m\n`);
  try { fs.mkdirSync(manifest.targetDir, { recursive: true }); } catch (e) {}

  const searchPattern = manifest.getPattern(manifest.binary);
  
  const apiOptions = {
    hostname: 'api.github.com',
    path: `/repos/${manifest.repo}/releases/latest`,
    headers: { 
      'User-Agent': 'SonoUtils-Launcher-Client-v1',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  https.get(apiOptions, (res) => {
    let data = '';

    // SAFE RATE-LIMIT TRAP: Clean error catching for API exhaustion
    if (res.statusCode === 403) {
      console.error(`\x1b[31m[API Error]: GitHub API Rate Limit Exceeded (403 Forbidden).\x1b[0m`);
      console.error(`\x1b[33mUnauthenticated requests are limited to 60/hr. Please wait or place binaries manually.\x1b[0m\n`);
      returnToMenu();
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`\x1b[31mGitHub API Error: Server responded with status ${res.statusCode} checking ${assetKey}\x1b[0m\n`);
      returnToMenu();
      return;
    }

    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const releaseInfo = JSON.parse(data);
        if (!releaseInfo.assets || !Array.isArray(releaseInfo.assets)) throw new Error("Invalid or empty asset array schema returned by API.");

        const targetAsset = releaseInfo.assets.find(asset => asset && asset.name && (asset.name.toLowerCase().includes(searchPattern.toLowerCase()) || asset.name === searchPattern));

        // SAFE VALUE GUARD: Prevent script crash if search returns null/undefined
        if (!targetAsset || !targetAsset.name) {
          throw new Error(`Could not locate a valid compiled binary payload matching pattern string: "${searchPattern}"`);
        }

        const assetExtension = path.extname(targetAsset.name);
        const tempPath = path.join(manifest.targetDir, `${assetKey}-temp${assetExtension || (isWin ? '.exe' : '')}`);

        console.log(`Downloading latest ${assetKey.toUpperCase()} build (${releaseInfo.tag_name || 'Latest'})...`);
        downloadFile(targetAsset.browser_download_url, tempPath, (err) => {
          if (err) {
            console.error(`\x1b[31m${assetKey.toUpperCase()} download sequence failed: ${err.message}\x1b[0m\n`);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            returnToMenu();
            return;
          }

          try {
            manifest.extract(tempPath, targetPath, manifest.binary);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            
            console.log(`\x1b[32m${assetKey.toUpperCase()} subsystem verified successfully!\x1b[0m\n`);
            if (process.platform !== 'win32') {
              try { fs.chmodSync(targetPath, '755'); } catch (e) {}
            }
            onReadyCallback();
          } catch (exErr) {
            console.error(`\x1b[31mExtraction engine failure mapping ${assetKey.toUpperCase()}: ${exErr.message}\x1b[0m\n`);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            returnToMenu();
          }
        });
      } catch (validationErr) {
        console.error(`\x1b[31mValidation processing error: ${validationErr.message}\x1b[0m\n`);
        returnToMenu();
      }
    });
  }).on('error', (apiErr) => {
    console.error(`\x1b[31mNetwork connection fault checking ${assetKey}: ${apiErr.message}\x1b[0m\n`);
    returnToMenu();
  });
}

function extractArchivedSubcomponent(archivePath, addonsDir, targetFilePath, targetBinaryName, targetSubdirName) {
  console.log(`Extraction in progress...`);
  try {
    if (process.platform === 'win32') {
      const extractDir = path.join(addonsDir, `${targetSubdirName}-extracted`);
      execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}' -Force"`);
      
      const sourceBinary = path.join(extractDir, 'ffmpeg-master-latest-win64-gpl', 'bin', targetBinaryName);
      if (!fs.existsSync(sourceBinary)) throw new Error(`Target subcomponent file not found inside unpacked source archive path tree.`);
      
      if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath);
      fs.renameSync(sourceBinary, targetFilePath);
      fs.rmSync(extractDir, { recursive: true, force: true });
    } else {
      // Safeguard: Check system tar capability before trying to untar packages blindly
      try {
        execSync(`tar --version`, { stdio: 'ignore' });
        if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath);
        execSync(`tar -xf "${archivePath}" -C "${addonsDir}" --strip-components=2 "*/bin/${targetSubdirName}"`);
      } catch (e) {
        throw new Error("Missing system dependency: 'tar' utility is required on this system profile.");
      }
    }
  } catch (err) {
    throw new Error(`Archive utility execution failure: ${err.message}`);
  }
}

function runMediaDownloader(workingDir) {
  const addons = path.join(workingDir, 'addons'), dist = path.join(workingDir, 'dist', 'downloads');
  fs.mkdirSync(dist, { recursive: true });

  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter video URL (or type "exit"):\n> ', (url) => {
    if (url.trim().toLowerCase() === 'exit' || !url.trim()) {
      rl.close();
      process.stdin.resume();
      initMenuInputEngine();
      renderMenu();
      return;
    }
    rl.question(`\n1: Audio (mp3) | 2: Video (mp4)\n> `, (mode) => {
      let args = ['--ffmpeg-location', addons, '--restrict-filenames', '-f', mode.trim() === '2' ? 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b' : 'ba/b', '-o', path.join(dist, `%(title)s_${Math.floor(Date.now() / 1000)}.%(ext)s`), url.trim()];
      if (mode.trim() !== '2') args.splice(5, 0, '-x', '--audio-format', 'mp3');

      rl.close();

      executeIsolatedProcess(path.join(addons, binaryName), args, 'YT-DLP Subsystem', {}, () => {
        process.stdin.resume();
        returnToMenu();
      });
    });
  });
}

// Helper function to handle the on-the-fly zip download safely with a progress bar
function downloadFile(url, dest, callback) {
  const file = fs.createWriteStream(dest);
  const parsedUrl = new URL(url);
  const requestOptions = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    headers: { 'User-Agent': 'SonoUtils-Launcher-NodeJS' }
  };

  https.get(requestOptions, (response) => {
    // Safely forward down both relative and absolute redirect rules
    if (response.statusCode === 302 || response.statusCode === 301) {
      let redirectUrl = response.headers.location;
      
      if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
        redirectUrl = new URL(redirectUrl, 'https://github.com').href;
      }
      
      file.close(() => {
        fs.unlink(dest, () => {
          downloadFile(redirectUrl, dest, callback); // Recursively loop
        });
      });
      return;
    }

    // STRICT ERROR CHECKING: Abort extraction sequence if the response isn't a success code
    if (response.statusCode !== 200) {
      file.close(() => {
        fs.unlink(dest, () => {
          callback(new Error(`Server responded with status code: ${response.statusCode}`));
        });
      });
      return;
    }

    // Progress Bar Variables
    const totalBytes = parseInt(response.headers['content-length'], 10);
    let receivedBytes = 0;

    response.on('data', (chunk) => {
      receivedBytes += chunk.length;
      
      if (totalBytes) {
        const percentage = ((receivedBytes / totalBytes) * 100).toFixed(1);
        const barWidth = 30;
        const filledWidth = Math.round((receivedBytes / totalBytes) * barWidth);
        const emptyWidth = barWidth - filledWidth;
        
        const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
        const currentMB = (receivedBytes / (1024 * 1024)).toFixed(2);
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

        // Clear current terminal line and write the visual progress bar status
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`📥 Downloading: [${progressBar}] ${percentage}% (${currentMB} / ${totalMB} MB)`);
      } else {
        // Fallback layout context status loop if the asset server drops Content-Length headers
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`📥 Downloading: ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB received...`);
      }
    });

    response.pipe(file);
    
    file.on('finish', () => {
      process.stdout.write('\n\n'); // Append clean breaking line structure upon loop exit completion
      file.close(callback);
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    callback(err);
  });
}

// Helper function to launch Sono-Overlay once downloaded/extracted
function startSonoOverlayProcess(overlayDir, overlayPath) {
  process.stdin.removeListener('data', onRawConsoleDataInput);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false); 
  }
  process.stdin.pause();

  console.log(`--- Starting Sono-Overlay ---\n`);

  const overlayProcess = spawn(overlayPath, [], {
    cwd: overlayDir,
    stdio: 'inherit'
  });

  overlayProcess.on('close', (code) => {
    console.log(`\n👋 Sono-Overlay completed or closed (Code: ${code}).`);
    initMenuInputEngine();
    returnToMenu();
  });

  overlayProcess.on('error', (err) => {
    console.error(`\x1b[31m[Spawn Error]: ${err.message}\x1b[0m\n`);
    initMenuInputEngine();
    returnToMenu();
  });
}

function renderMenu() {
  process.stdout.write('\x1b[2J\x1b[0;0H');
  console.log('--- \x1b[96mSono \x1b[95mUtils \x1b[0m(v1.0.0) ---\n(Use Arrow Keys, Press Enter to Select)\n');
  MENU_ITEMS.forEach((item, idx) => {
    if (idx == selectedIndex) {
      console.log(`\x1b[32m > [ ${item} ] \x1b[0m`)
    } else {
      console.log(`   [ ${item} ] `)
    }
  });
}

function returnToMenu() {
  process.stdout.write('\n\x1b[33mPress any key to return to main menu...\x1b[0m');
  process.stdin.removeListener('data', onRawConsoleDataInput);

  const tempHandler = () => {
    process.stdin.removeListener('data', tempHandler);
    initMenuInputEngine();
    renderMenu();
  };

  // 100ms timeout prevents previous Enter-key buffer sequences from auto-triggering the prompt page context
  setTimeout(() => {
    process.stdin.on('data', tempHandler);
  }, 100);
}

// Automatically scrubs loose, half-downloaded or corrupted temp files from previous sessions
function cleanTrailingDebris(workingDir) {
  const targets = [path.join(workingDir, 'addons'), path.join(workingDir, 'Sono-Overlay'), path.join(workingDir, 'server')];
  
  targets.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.includes('-temp')) {
          const brokenFilePath = path.join(dir, file);
          fs.unlinkSync(brokenFilePath);
        }
      });
    } catch (e) { /* Fail silently during initial workspace load setups */ }
  });
}

// Global execution hooks
cleanTrailingDebris(process.pkg ? path.dirname(process.execPath) : __dirname);
initMenuInputEngine();
renderMenu();