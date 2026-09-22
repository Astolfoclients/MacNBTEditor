const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const nbt = require('nbt');

let win;
let currentOpenFilePath = '';

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

ipcMain.on('open-file-dialog', (event) => {
  dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Minecraft NBT Files', extensions: ['dat', 'nbt'] }]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      currentOpenFilePath = result.filePaths[0];
      const fileBuffer = fs.readFileSync(currentOpenFilePath);

      nbt.parse(fileBuffer, (error, parsedData) => {
        if (error) {
          event.reply('status', `NBT Parse Error: ${error.message}`);
          return;
        }
        event.reply('file-loaded', JSON.stringify(parsedData, null, 4));
      });
    } else {
      event.reply('status', 'Ready for file selection...');
    }
  }).catch(err => {
    event.reply('status', `Dialog Error: ${err.message}`);
  });
});

ipcMain.on('save-file-changes', (event, editedJsonText) => {
  if (!currentOpenFilePath) {
    event.reply('status', 'Error: No active file stream.');
    return;
  }
  try {
    const updatedValues = JSON.parse(editedJsonText);
    
    // FIX: Use the exact method name exported by the 'nbt' library
    const uncompressedBinary = nbt.writeUncompressed(updatedValues);
    
    // Compress the output buffer via standard Gzip framing to match level.dat rules
    const compressedGzipBuffer = zlib.gzipSync(Buffer.from(uncompressedBinary));
    
    fs.writeFileSync(currentOpenFilePath, compressedGzipBuffer);
    event.reply('status', 'Success! NBT file updated and saved to disk safely!');
  } catch (err) {
    event.reply('status', `Save Error: ${err.message}`);
  }
});
