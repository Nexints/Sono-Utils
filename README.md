# SonoUtils

This program launches a bunch of utilities for the game Sonolus.

SonoUtils contains:
- Sono-Overlay (On the fly)
- Custom Sonolus Server (On the fly)
- YT-DLP support (On the fly)

WARN: Everything in this program is downloaded on the fly on first startup.

## Workflow

This tool is intended to be used in this workflow:
- Open SonoUtils
- Download a .mp3 from YouTube
- Make a chart using chart editor of choice
- Open the custom server and configure it according to the console-based GUI
- Start the server and record a white / black BG gameplay (needed for Sono-Overlay)
- Shut down the custom server and then swap to Sono-Overlay
- Download the .mp4 file
- Use Sono-Overlay to get the overlay using local files
- Use AviUtl2 to edit your video

This tool should speed up testing by orders of magnitude!

## Terms of Use

1. **(REQUIRED)** You must make this text visible in the video description or video itself.

**EN**
```
Sono-Utils:
- Made by Nexint (https://nexint.ca/)
- https://github.com/Nexints/SonoUtils
```

2. This tool **should not be used for malicious purposes** (such as, but not limited to: spreading misinformation on social media).
3. The author **assumes no responsibility whatsoever** for any issues or disadvantages arising from the use of this tool. This tool is provided AS IS, with no warranties.
4. (NEW) You are not allowed to use this tool with official SEGA assets.
5. (NEW) You are not to use this tool on other people's charts, unless you have express permission from said person.

## Legal:
The included ProSeka Faithful UI is governed under my [Nexint TOS](https://nexint.ca/tos).
While the whole wrapper is under the Apache 2.0 License, parts of this program are under the AGPL and parts are under my Nexint TOS.

This program remains compliant by ensuring that this program does not rely on AGPL code. This code is mere aggregation of AGPL code.

To show this, Sono-Overlay is downloaded on the fly when the user runs the program, and is NOT bundled into the program.

Please check the [Nexint TOS](https://nexint.ca/tos) when using this tool with ProSeka Faithful!

### AI Disclosure:
Some parts of SonoUtils were coded with AI.

I've made sure to independantly tweak and test nearly everything this program outputs.