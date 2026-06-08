const CryptoJS = require('crypto-js');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// In a real app, this should be stored securely (e.g., Electron's safeStorage or a hidden file)
// For the MVP, we'll use a local key file.
const KEY_PATH = path.join(app.getPath('userData'), '.key');

function getOrCreateKey() {
  if (fs.existsSync(KEY_PATH)) {
    return fs.readFileSync(KEY_PATH, 'utf8');
  }
  const key = CryptoJS.lib.WordArray.random(32).toString();
  fs.writeFileSync(KEY_PATH, key, 'utf8');
  return key;
}

const MASTER_KEY = getOrCreateKey();

function encrypt(text) {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, MASTER_KEY).toString();
}

function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, MASTER_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
