/**
 * Raindrop Backup Module for Highlighter Bear
 * Handles backup and restore of highlighting rules to/from Raindrop.io
 */

// Configuration
const RAINDROP_API_BASE = 'https://api.raindrop.io/rest/v1';
const COLLECTION_NAME = 'Highlight Bear';
const TOKEN_EXPIRY_BUFFER_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

// Custom Error Class
export class RaindropApiError extends Error {
  constructor(message, status, statusText) {
    super(message);
    this.status = status;
    this.statusText = statusText;
  }
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Check if OAuth token is expiring soon
 */
function isOAuthTokenExpiringSoon(expiresAt) {
  if (!expiresAt) return true;
  return Date.now() + TOKEN_EXPIRY_BUFFER_MS >= expiresAt;
}

/**
 * Refresh OAuth token using refresh token
 */
async function refreshOAuthToken(refreshToken) {
  try {
    const response = await fetch(
      'https://ohauth.vercel.app/oauth/raindrop/refresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );

    if (!response.ok) {
      console.error('[Raindrop] Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.access_token && data.refresh_token && data.expires_in) {
      const expiresAt = Date.now() + data.expires_in * 1000;

      // Update stored tokens
      await chrome.storage.sync.set({
        oauthAccessToken: data.access_token,
        oauthRefreshToken: data.refresh_token,
        oauthExpiresAt: expiresAt,
      });

      console.log('[Raindrop] Token refreshed successfully');
      return data;
    }

    return null;
  } catch (error) {
    console.error('[Raindrop] Token refresh error:', error);
    return null;
  }
}

/**
 * Get active OAuth token (refreshing if necessary)
 */
async function getActiveToken() {
  const data = await chrome.storage.sync.get([
    'oauthAccessToken',
    'oauthRefreshToken',
    'oauthExpiresAt',
  ]);

  if (data.oauthAccessToken && data.oauthRefreshToken) {
    // Check if token is expiring soon
    if (isOAuthTokenExpiringSoon(data.oauthExpiresAt)) {
      console.log('[Raindrop] Token expiring soon, refreshing...');
      const refreshed = await refreshOAuthToken(data.oauthRefreshToken);
      return refreshed?.access_token || data.oauthAccessToken;
    }
    return data.oauthAccessToken;
  }

  return '';
}

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic for rate limiting
 */
async function fetchWithRetry(url, options) {
  let retries = 0;

  while (true) {
    const res = await fetch(url, options);

    // If not rate limited or max retries reached, return response
    if (res.status !== 429 || retries >= MAX_RETRIES) {
      return res;
    }

    // Calculate backoff time (exponential: 1s, 2s, 4s, 8s, 16s)
    const backoffMs = INITIAL_BACKOFF_MS * 2 ** retries;
    console.log(`[Raindrop] Rate limited. Retrying in ${backoffMs}ms...`);

    await sleep(backoffMs);
    retries++;
  }
}

/**
 * GET request to Raindrop API
 */
async function apiGET(path, token) {
  const url = `${RAINDROP_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new RaindropApiError(
      `API error ${res.status} for ${path}: ${text}`,
      res.status,
      res.statusText,
    );
  }

  return res.json();
}

/**
 * POST request to Raindrop API
 */
async function apiPOST(path, body, token) {
  const url = `${RAINDROP_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new RaindropApiError(
      `API error ${res.status} for ${path}: ${text}`,
      res.status,
      res.statusText,
    );
  }

  return res.json();
}

/**
 * PUT request to Raindrop API
 */
async function apiPUT(path, body, token) {
  const url = `${RAINDROP_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetchWithRetry(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new RaindropApiError(
      `API error ${res.status} for ${path}: ${text}`,
      res.status,
      res.statusText,
    );
  }

  return res.json();
}

/**
 * DELETE request to Raindrop API
 */
async function apiDELETE(path, token) {
  const url = `${RAINDROP_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetchWithRetry(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new RaindropApiError(
      `API error ${res.status} for ${path}: ${text}`,
      res.status,
      res.statusText,
    );
  }

  // DELETE may return empty response
  try {
    return await res.json();
  } catch (_) {
    return { result: true };
  }
}

// ============================================================================
// Collection Management
// ============================================================================

/**
 * Get or create the Highlight Bear collection
 */
async function getOrCreateCollection(token) {
  // Check if collection exists
  const collectionsRes = await apiGET('/collections', token);
  const collections = collectionsRes.items || [];

  const existing = collections.find((c) => c.title === COLLECTION_NAME);

  if (existing) {
    return existing._id;
  }

  // Create new collection
  console.log(`[Raindrop] Creating collection: ${COLLECTION_NAME}`);
  const createRes = await apiPOST(
    '/collection',
    {
      title: COLLECTION_NAME,
      view: 'list',
    },
    token,
  );

  return createRes.item._id;
}

/**
 * Find existing collection by name
 */
async function findCollectionId(token) {
  const collectionsRes = await apiGET('/collections', token);
  const collections = collectionsRes.items || [];

  const existing = collections.find((c) => c.title === COLLECTION_NAME);
  return existing?._id || null;
}

/**
 * Fetch all items from a collection (with pagination)
 */
async function fetchAllItemsFromCollection(collectionId, token) {
  const allItems = [];
  let page = 0;
  const perpage = 50;
  let hasMore = true;

  while (hasMore) {
    const response = await apiGET(
      `/raindrops/${collectionId}?perpage=${perpage}&page=${page}`,
      token,
    );

    if (response?.items?.length > 0) {
      allItems.push(...response.items);
      page++;
      hasMore = response.items.length === perpage;
    } else {
      hasMore = false;
    }

    if (hasMore) {
      await sleep(100); // Rate limiting between pagination requests
    }
  }

  return allItems;
}

// ============================================================================
// Data Mapping - Rules to Raindrop Items
// ============================================================================

/**
 * Prepare Raindrop data from a rule
 */
function prepareRaindropData(rules, collectionId) {
  // Use custom protocol for unique identification
  const link = 'highlighter-bear://rules/all';

  // Create a title with summary
  const title = `Highlighter Bear Rules (${rules.length} rules)`;

  // Store entire rules array as JSON in the note field
  const note = JSON.stringify(rules, null, 2);

  // Store metadata in excerpt (for quick identification)
  const metadata = {
    version: '1.0',
    rulesCount: rules.length,
    lastSync: new Date().toISOString(),
  };

  return {
    link,
    title,
    note,
    excerpt: JSON.stringify(metadata, null, 2),
    collection: { $id: collectionId },
    tags: ['highlighter-bear', 'rules'],
  };
}

// ============================================================================
// Backup Function
// ============================================================================

/**
 * Backup rules to Raindrop
 */
export async function backupRulesToRaindrop() {
  try {
    console.log('[Raindrop] Starting backup...');

    // Get OAuth token
    const token = await getActiveToken();
    if (!token) {
      return {
        success: false,
        message: 'Please login to Raindrop.io first.',
      };
    }

    // Load rules from storage
    const data = await chrome.storage.sync.get(['highlighterRules']);
    const rules = data.highlighterRules || [];

    if (rules.length === 0) {
      return {
        success: false,
        message: 'No rules to backup.',
      };
    }

    // Get or create the collection
    const collectionId = await getOrCreateCollection(token);

    // Fetch existing items
    const existingItems = await fetchAllItemsFromCollection(
      collectionId,
      token,
    );

    // Find existing rules item
    const existingRulesItem = existingItems.find((item) =>
      item.link?.startsWith('highlighter-bear://rules/'),
    );

    // Prepare Raindrop data
    const raindropData = prepareRaindropData(rules, collectionId);

    if (existingRulesItem) {
      // Update existing item
      console.log('[Raindrop] Updating existing rules item...');
      await apiPUT(`/raindrop/${existingRulesItem._id}`, raindropData, token);

      return {
        success: true,
        message: `✓ ${rules.length} rules backed up successfully (updated)`,
        stats: {
          rulesCount: rules.length,
          collectionId,
          operation: 'update',
        },
      };
    } else {
      // Create new item
      console.log('[Raindrop] Creating new rules item...');
      await apiPOST('/raindrop', raindropData, token);

      return {
        success: true,
        message: `✓ ${rules.length} rules backed up successfully (created)`,
        stats: {
          rulesCount: rules.length,
          collectionId,
          operation: 'create',
        },
      };
    }
  } catch (error) {
    console.error('[Raindrop] Backup failed:', error);
    return {
      success: false,
      message: `Backup failed: ${error.message}`,
    };
  }
}

// ============================================================================
// Restore Function
// ============================================================================

/**
 * Restore rules from Raindrop
 */
export async function restoreRulesFromRaindrop() {
  try {
    console.log('[Raindrop] Starting restore...');

    // Get OAuth token
    const token = await getActiveToken();
    if (!token) {
      return {
        success: false,
        message: 'Please login to Raindrop.io first.',
      };
    }

    // Find collection
    const collectionId = await findCollectionId(token);
    if (!collectionId) {
      return {
        success: false,
        message: `No "${COLLECTION_NAME}" collection found. Backup your rules first.`,
      };
    }

    // Fetch all items from collection
    const items = await fetchAllItemsFromCollection(collectionId, token);

    // Find rules item
    const rulesItem = items.find((item) =>
      item.link?.startsWith('highlighter-bear://rules/'),
    );

    if (!rulesItem) {
      return {
        success: false,
        message: 'No rules found in Raindrop. Backup your rules first.',
      };
    }

    // Parse rules from note field
    let restoredRules = [];
    try {
      restoredRules = JSON.parse(rulesItem.note || '[]');
    } catch (error) {
      return {
        success: false,
        message: 'Failed to parse rules from Raindrop. Data may be corrupted.',
      };
    }

    // Validate rules structure
    if (!Array.isArray(restoredRules)) {
      return {
        success: false,
        message: 'Invalid rules format in Raindrop.',
      };
    }

    // Replace local rules with restored rules
    await chrome.storage.sync.set({ highlighterRules: restoredRules });

    console.log('[Raindrop] Restore completed:', restoredRules.length, 'rules');

    return {
      success: true,
      message: `✓ ${restoredRules.length} rule(s) restored from Raindrop`,
      stats: {
        restoredCount: restoredRules.length,
        collectionId,
      },
    };
  } catch (error) {
    console.error('[Raindrop] Restore failed:', error);
    return {
      success: false,
      message: `Restore failed: ${error.message}`,
    };
  }
}
