/*
This specific launcher is open-source, but the Sonolus Server is governed under the Nexint TOS.
Sono-Overlay is under the AGPL-v3.
This program is simply a wrapper that makes calling Sono-Overlay easier for the user,
as well as unifies all Sonolus utilities into one megapackage.
*/

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

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

    // Fully release the parent's control over the terminal keyboard channel
    process.stdin.removeListener('data', onRawConsoleDataInput);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false); // Drop parent raw state
    }
    process.stdin.pause();

    const overlayDir = path.join(workingDir, 'Sono-Overlay');
    const overlayPath = path.join(overlayDir, 'sono-overlay.exe');
    
    if (!fs.existsSync(overlayPath)) {
      console.clear();
      console.log(`\x1b[31m--- [Feature Restricted] ---\x1b[0m\n`);
      console.log("Sono-Overlay is not found in your directory footprint.");
      console.log("To use this feature, download the AGPL-licensed binary into /Sono-Overlay.\n");
      returnToMenu();
      return;
    }

    console.log(`--- Starting Sono-Overlay ---\n`);

    // Spawn with absolute 'inherit'. Sono-Overlay now directly communicates 
    // with the physical Windows terminal handle, allowing its internal Go packages
    // (rawmode / gokilo) to capture your typing perfectly with 0 lag or locks.
    const overlayProcess = spawn(overlayPath, [], {
      cwd: overlayDir,
      stdio: 'inherit'
    });

    overlayProcess.on('close', (code) => {
      console.log(`\n👋 Sono-Overlay completed or closed (Code: ${code}).`);

      // Fully re-engage our binary keyboard listening engine when it returns
      initMenuInputEngine();
      returnToMenu();
    });

    overlayProcess.on('error', (err) => {
      console.error(`\x1b[31m[Spawn Error]: ${err.message}\x1b[0m\n`);
      initMenuInputEngine();
      returnToMenu();
    });
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