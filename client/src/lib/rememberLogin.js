const EMAIL_KEY = 'doccheck.rememberEmail';
const REMEMBER_FLAG_KEY = 'doccheck.rememberMe';
const LEGACY_EMAIL_KEY = 'docucheck.rememberEmail';

function isDesktopApp() {
  return Boolean(typeof window !== 'undefined' && window.doccheckDesktop?.isDesktop);
}

function desktopApi() {
  return typeof window !== 'undefined' ? window.doccheckDesktop : null;
}

function readLocalEmail() {
  try {
    localStorage.removeItem(LEGACY_EMAIL_KEY);
    return localStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

function writeLocalEmail(email) {
  try {
    const value = String(email || '').trim();
    if (value) localStorage.setItem(EMAIL_KEY, value);
    else localStorage.removeItem(EMAIL_KEY);
    localStorage.setItem(REMEMBER_FLAG_KEY, value ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
}

function clearLocalEmail() {
  try {
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(REMEMBER_FLAG_KEY);
    localStorage.removeItem(LEGACY_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

async function readBrowserPasswordCredential(fallbackEmail) {
  if (typeof navigator === 'undefined' || !navigator.credentials?.get) return '';
  try {
    const cred = await navigator.credentials.get({
      password: true,
      mediation: 'silent',
    });
    if (cred && 'password' in cred) {
      const id = String(cred.id || '').trim();
      if (!fallbackEmail || !id || id.toLowerCase() === fallbackEmail.toLowerCase()) {
        return String(cred.password || '');
      }
    }
  } catch {
    /* user dismissed or API unavailable */
  }
  return '';
}

async function storeBrowserPasswordCredential(email, password) {
  if (typeof window === 'undefined' || !window.PasswordCredential || !navigator.credentials?.store) return;
  try {
    await navigator.credentials.store(
      new window.PasswordCredential({
        id: email,
        password,
        name: email,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function peekRememberedEmail() {
  return readLocalEmail();
}

export async function loadRememberedLogin() {
  const desktop = desktopApi();
  if (isDesktopApp() && desktop?.loadRememberedLogin) {
    try {
      const saved = await desktop.loadRememberedLogin();
      if (saved?.email) {
        writeLocalEmail(saved.email);
        return {
          email: String(saved.email),
          password: String(saved.password || ''),
          remember: true,
        };
      }
    } catch {
      /* fall through to local storage */
    }
  }

  const email = readLocalEmail();
  const rememberFlag = (() => {
    try {
      return localStorage.getItem(REMEMBER_FLAG_KEY);
    } catch {
      return null;
    }
  })();
  const remember = rememberFlag === '1' || Boolean(email);
  if (!remember) {
    return { email: '', password: '', remember: false };
  }
  const password = await readBrowserPasswordCredential(email);
  return { email, password, remember: true };
}

export async function saveRememberedLogin({ email, password }) {
  const trimmed = String(email || '').trim();
  writeLocalEmail(trimmed);
  const desktop = desktopApi();
  if (isDesktopApp() && desktop?.saveRememberedLogin) {
    await desktop.saveRememberedLogin({ email: trimmed, password: String(password || '') });
    return;
  }
  if (trimmed && password) {
    await storeBrowserPasswordCredential(trimmed, password);
  }
}

export async function clearRememberedLogin() {
  clearLocalEmail();
  const desktop = desktopApi();
  if (isDesktopApp() && desktop?.clearRememberedLogin) {
    await desktop.clearRememberedLogin();
  }
}
