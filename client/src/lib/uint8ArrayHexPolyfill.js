/** pdf.js 5 uses Uint8Array.toHex/toBase64 (Chrome 140+). Electron 36 is Chromium 136. */

function installUint8ArrayHexPolyfill() {
  if (typeof Uint8Array === 'undefined') return;

  if (typeof Uint8Array.prototype.toHex !== 'function') {
    Object.defineProperty(Uint8Array.prototype, 'toHex', {
      configurable: true,
      writable: true,
      value() {
        let out = '';
        for (let i = 0; i < this.length; i += 1) {
          out += this[i].toString(16).padStart(2, '0');
        }
        return out;
      },
    });
  }

  if (typeof Uint8Array.prototype.toBase64 !== 'function') {
    Object.defineProperty(Uint8Array.prototype, 'toBase64', {
      configurable: true,
      writable: true,
      value({ alphabet } = {}) {
        const chars = alphabet === 'base64url'
          ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
          : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        const len = this.length;
        for (let i = 0; i < len; i += 3) {
          const a = this[i];
          const b = i + 1 < len ? this[i + 1] : 0;
          const c = i + 2 < len ? this[i + 2] : 0;
          result += chars[a >> 2];
          result += chars[((a & 3) << 4) | (b >> 4)];
          result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : '=';
          result += i + 2 < len ? chars[c & 63] : '=';
        }
        if (alphabet === 'base64url') result = result.replace(/=+$/, '');
        return result;
      },
    });
  }

  if (typeof Uint8Array.fromHex !== 'function') {
    Object.defineProperty(Uint8Array, 'fromHex', {
      configurable: true,
      writable: true,
      value(hex) {
        const s = String(hex || '').replace(/\s+/g, '');
        const out = new Uint8Array(Math.floor(s.length / 2));
        for (let i = 0; i < out.length; i += 1) {
          out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
        }
        return out;
      },
    });
  }
}

installUint8ArrayHexPolyfill();
