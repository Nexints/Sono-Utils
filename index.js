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
  if (label === 'Launch YT-DLP wrapper') {
    process.stdin.removeListener('data', onRawConsoleDataInput);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    runMediaDownloader(workingDir);
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
    console.log("- Sono-Overlay is under the AGPL");
    console.log("- YT-DLP is under the Unlicense");
    console.log("- Proseka Faithful is under the Nexint TOS");
    console.log("- All other coding projects are licensed under the Apache 2.0");
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
    console.log("The main SonoUtils only acts as a launcher for various indepent applets.");
    console.log("Have fun when using this tool! There are no blacklists, and this tool remains open source.");
    returnToMenu();
  }

  if (label === 'Launch Sonolus Server') {
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
  } else if (label === 'Launch Sono-Overlay') {
    const overlayDir = path.join(workingDir, 'Sono-Overlay');
    const overlayPath = path.join(overlayDir, 'sono-overlay.exe');

    // Download the latest version
    if (!fs.existsSync(overlayPath)) {
      console.log(`\x1b[33m[Notice]: Sono-Overlay binary missing. Checking GitHub for the latest release...\x1b[0m\n`);
      
      fs.mkdirSync(overlayDir, { recursive: true });
      const tempZipPath = path.join(overlayDir, 'sono-overlay-temp.zip');

      // Request options for the GitHub API to fetch the latest release tag name
      const apiOptions = {
        hostname: 'api.github.com',
        path: '/repos/Nexints/Sono-Overlay/releases/latest',
        headers: { 'User-Agent': 'SonoUtils-Launcher-NodeJS' }
      };

      https.get(apiOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const releaseInfo = JSON.parse(data);
            const latestTag = releaseInfo.tag_name;

            if (!latestTag) {
              throw new Error("Could not parse the latest release tag from GitHub.");
            }

            // Download the first asset (a zip file)
            const downloadUrl = releaseInfo.assets[0].browser_download_url;
            console.log(`Downloading latest version (${latestTag})...`);
            console.log(downloadUrl)

            downloadFile(downloadUrl, tempZipPath, (err) => {
              if (err) {
                console.error(`\x1b[31mDownload failed: ${err.message}\x1b[0m\n`);
                returnToMenu();
                return;
              }

              console.log(`Extraction in progress...`);
              try {
                if (process.platform === 'win32') {
                  execSync(`powershell -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${overlayDir}' -Force"`);
                } else {
                  execSync(`unzip -o "${tempZipPath}" -d "${overlayDir}"`);
                }
                
                fs.unlinkSync(tempZipPath);
                console.log(`\x1b[32mDownload complete!\x1b[0m\n`);
                
                startSonoOverlayProcess(overlayDir, overlayPath);
              } catch (extractErr) {
                console.error(`\x1b[31mExtraction error: ${extractErr.message}\x1b[0m\n`);
                returnToMenu();
              }
            });

          } catch (apiErr) {
            console.error(`\x1b[31mGitHub API Error: ${apiErr.message}\x1b[0m\n`);
            returnToMenu();
          }
        });
      }).on('error', (apiErr) => {
        console.error(`\x1b[31mNetwork Error while reaching GitHub: ${apiErr.message}\x1b[0m\n`);
        returnToMenu();
      });

    } else {
      // If it already exists locally, execute it directly
      startSonoOverlayProcess(overlayDir, overlayPath);
    }
  }
}

function runMediaDownloader(workingDir) {
  const addons = path.join(workingDir, 'addons'), dist = path.join(workingDir, 'dist', 'downloads');
  fs.mkdirSync(dist, { recursive: true });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter video URL (or type "exit"):\n> ', (url) => {
    if (url.trim().toLowerCase() === 'exit' || !url.trim()) {
      rl.close();
      initMenuInputEngine();
      renderMenu();
      return;
    }
    rl.question(`\n1: Audio (mp3) | 2: Video (mp4)\n> `, (mode) => {
      let args = ['--ffmpeg-location', addons, '--restrict-filenames', '-f', mode.trim() === '2' ? 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b' : 'ba/b', '-o', path.join(dist, `%(title)s_${Math.floor(Date.now() / 1000)}.%(ext)s`), url.trim()];
      if (mode.trim() !== '2') args.splice(5, 0, '-x', '--audio-format', 'mp3');

      rl.close();

      executeIsolatedProcess(path.join(addons, 'yt-dlp.exe'), args, 'YT-DLP Subsystem', {}, () => {
        // FIXED: Routed Option 3 here to land uniformly on the interactive menu confirmation loop
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

initMenuInputEngine();
renderMenu();