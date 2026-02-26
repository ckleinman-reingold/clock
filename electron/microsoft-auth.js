import { BrowserWindow } from 'electron'
import crypto from 'crypto'

const REDIRECT_URI = 'http://localhost'
const SCOPES = ['Calendars.Read', 'User.Read', 'offline_access']

function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32))
}

function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return base64URLEncode(hash)
}

export function createMicrosoftAuth(store) {
  let authWindow = null

  async function getAuthUrl(clientId) {
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    // Store code verifier for token exchange
    store.setMicrosoftCodeVerifier(codeVerifier)

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      response_mode: 'query',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  }

  async function exchangeCodeForTokens(clientId, code) {
    const codeVerifier = store.getMicrosoftCodeVerifier()

    const params = new URLSearchParams({
      client_id: clientId,
      scope: SCOPES.join(' '),
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    })

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const tokens = await response.json()
    store.setMicrosoftTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    })

    return tokens
  }

  async function refreshAccessToken(clientId) {
    const tokens = store.getMicrosoftTokens()
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const params = new URLSearchParams({
      client_id: clientId,
      scope: SCOPES.join(' '),
      refresh_token: tokens.refreshToken,
      grant_type: 'refresh_token',
    })

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!response.ok) {
      // Refresh token expired, need to re-auth
      store.setMicrosoftTokens(null)
      throw new Error('Refresh token expired')
    }

    const newTokens = await response.json()
    store.setMicrosoftTokens({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + (newTokens.expires_in * 1000),
    })

    return newTokens.access_token
  }

  async function getValidAccessToken(clientId) {
    const tokens = store.getMicrosoftTokens()
    if (!tokens) {
      return null
    }

    // Refresh if expires in less than 5 minutes
    if (tokens.expiresAt < Date.now() + 300000) {
      return await refreshAccessToken(clientId)
    }

    return tokens.accessToken
  }

  function startAuthFlow(clientId) {
    return new Promise(async (resolve, reject) => {
      try {
        const authUrl = await getAuthUrl(clientId)

        authWindow = new BrowserWindow({
          width: 500,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        })

        authWindow.loadURL(authUrl)

        authWindow.webContents.on('will-redirect', async (event, url) => {
          if (url.startsWith(REDIRECT_URI)) {
            event.preventDefault()
            const urlObj = new URL(url)
            const code = urlObj.searchParams.get('code')
            const error = urlObj.searchParams.get('error')

            if (authWindow) {
              authWindow.close()
              authWindow = null
            }

            if (error) {
              reject(new Error(error))
            } else if (code) {
              try {
                await exchangeCodeForTokens(clientId, code)
                resolve({ success: true })
              } catch (err) {
                reject(err)
              }
            }
          }
        })

        authWindow.on('closed', () => {
          authWindow = null
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  function logout() {
    store.setMicrosoftTokens(null)
    store.setMicrosoftCodeVerifier(null)
  }

  return {
    startAuthFlow,
    getValidAccessToken,
    logout,
  }
}
