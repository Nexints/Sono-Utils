const path = require('path');

module.exports = {
    // Server Constants
    ADDRESS: "0.0.0.0", // Port address
    PORT: 39039, // Server Port
    https: false,
    
    // Cosmetic
    title: "Sono-Overlay Local Server",
    desc: "Custom-coded, lightweight Sonolus server for Sono-Overlay users.",
    debug: false,

    // Settings
    UPLOADS_DIR: path.join(__dirname, 'uploads'), // Use this for .scp files
    ENGINES_POOL_DIR: path.join(__dirname, 'engines_pool'), // Use this for engines
    LEVELS_POOL_DIR: path.join(__dirname, 'levels_pool'), // Use this for levels
    BANNER_POOL_DIR: path.join(__dirname, 'banner_pool'), // Use this for the banner
    SOURCE_DIR: path.join(__dirname, 'source'), // Source?
    TEMP_EXTRACT_DIR: path.join(__dirname, 'temp_extracted'), // The temporary directory
};