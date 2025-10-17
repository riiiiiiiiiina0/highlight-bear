/**
 * OAuth Module for Highlighter Bear
 * Handles OAuth token reception from external OAuth service
 */

/**
 * Initialize OAuth listener to receive tokens from external OAuth service
 */
export function initOAuthListener() {
  chrome.runtime.onMessageExternal.addListener(
    (message, sender, sendResponse) => {
      // Verify sender is from trusted OAuth service
      if (!sender.url || !sender.url.startsWith('https://ohauth.vercel.app/')) {
        console.warn(
          '[OAuth] Rejected message from untrusted sender:',
          sender.url,
        );
        return;
      }

      // Verify message format
      if (
        message?.type === 'oauth_success' &&
        message?.provider === 'raindrop' &&
        message?.tokens
      ) {
        const { access_token, refresh_token, expires_in } = message.tokens;

        if (access_token && refresh_token && expires_in) {
          // Convert expires_in (seconds) to absolute timestamp
          const expiresAt = Date.now() + expires_in * 1000;

          // Store tokens in sync storage (syncs across devices)
          chrome.storage.sync.set(
            {
              oauthAccessToken: access_token,
              oauthRefreshToken: refresh_token,
              oauthExpiresAt: expiresAt,
            },
            () => {
              console.log('[OAuth] Tokens stored successfully');

              // Notify user of successful login
              chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon-128x128.png'),
                title: 'Highlighter Bear',
                message: '🔐 Raindrop login successful!',
              });

              sendResponse({ success: true });
            },
          );
        } else {
          console.error('[OAuth] Invalid token data received');
          sendResponse({ success: false, error: 'Invalid token data' });
        }

        return true; // Keep message channel open for async response
      }
    },
  );

  console.log('[OAuth] Listener initialized');
}
