// dropboxApi.js

require('dotenv').config();

let fetch;
let Dropbox;
let dbx;
let retryCount = 0;
const refreshToken = process.env.REFRESH_TOKEN;
let adminId = process.env.ADMIN_ID;
let currentAccessToken = process.env.CURRENT_ACCESS_TOKEN;

// Initialize Dropbox with Refresh Token
async function initializeWithRefreshToken() {
    try {
        const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'grant_type': 'refresh_token',
                'refresh_token': refreshToken,
                'client_id': process.env.CLIENT_ID,
                'client_secret': process.env.CLIENT_SECRET,
            }),
        });

        const data = await response.json();

        if (data.access_token) {
            console.log('New Access Token Obtained');
            currentAccessToken = data.access_token;
            refreshToken = data.refresh_token;
        } else {
            console.log('Failed to obtain new access token', data);        
        }        
    } catch (error) {
        console.error('Error refreshing token: ', error);
    }
}

// Function to Refresh Token If Needed
async function refreshTokenIfNeeded(error) {
    if (error.status === 401) {
        console.log("Refreshing token...");
        await initializeWithRefreshToken();
    }
}

// Initialize Dropbox
async function initializeDropbox() {
    fetch = await import('node-fetch').then(module => module.default);
    Dropbox = await import('dropbox').then(module => module.Dropbox);

    // Initialize with refresh token first
    await initializeWithRefreshToken();

    dbx = new Dropbox({
        accessToken: currentAccessToken,
        fetch: fetch,
        selectUser: adminId
    });    
}

// Asynchronous function to create sub-folders
async function createFolder(channelName, folder) {
    try {
        const response = await dbx.filesCreateFolderV2({
            path: `/${channelName}/${folder}`
        });
        console.log('Folder created successfully:', response);
        return 'folder_created';  // Return a success status
    } catch (error) {
        console.error(`Error creating folder: ${error}`);
        await refreshTokenIfNeeded(error);
        
        if (error.status === 409) {
            // Conflict (folder already exists)
            return 'folder_exists';
        }

        throw error;  // Re-throw error for other cases
    }
}

// Asynchronous function to create the root folder for a specific user
async function createRootFolderForUser(channelName, adminId) {
    try {
        const response = await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${dbx.accessToken}`,
                'Content-Type': 'application/json',
                'Dropbox-API-Select-Admin': adminId
            },
            body: JSON.stringify({ path: `/${channelName}` })
        });

        const jsonResponse = await response.json();

        if (response.ok) {
            console.log('Root folder created successfully:', jsonResponse);
        } else {
            console.log('Error creating folder:', jsonResponse);
        }

    } catch (error) {
        console.error(`Error creating root folder for user: ${error}`);
        throw error;
    }
}

// New function to create a folder using raw fetch
async function createRootFolderWithFetch(channelName) {
    try {
        const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Content-Type': 'application/json',
                'Dropbox-API-Select-User': adminId
            },
            body: JSON.stringify({
                path: `/${channelName}`
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log(`Root folder created: ${JSON.stringify(result)}`);
        } else {
            console.log(`Failed to create root folder: ${JSON.stringify(result)}`);
        }
    } catch (error) {
        console.error(`Error creating root folder: ${error}`);
    }
}

async function createSharedLinkWithRetry(path) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await dbx.sharingCreateSharedLinkWithSettings({ path });
            console.log('Shared link created successfully:', response.url);
            resetRetryCount();
            resolve(response.url);
        } catch (error) {
            await refreshTokenIfNeeded(error);
            if (error.status === 429 && retryCount < 3) {
                const retryAfter = parseInt(error.headers['retry-after'], 10) || 300;
                console.log(`Rate limit exceeded. Retrying in ${retryAfter} seconds.`);
                setTimeout(async () => {
                    try {
                        const url = await createSharedLinkWithRetry(path);
                        resolve(url);
                    } catch (err) {
                        reject(err);
                    }
                }, retryAfter * 1000);
                retryCount++;
            } else if (error.status !== 401) {
                console.error(`Error creating shared link: ${error}`);
                reject(error);
            }
        }
    });
}

// Reset the retry count after a successful operation
async function resetRetryCount() {
    retryCount = 0;
}

async function createFolderWithRetry(channelName, folder) {
    try {
        await createFolder(channelName, folder);
        resetRetryCount();  // Reset the retry count on a successful operation
    } catch (error) {
        if (error.status === 429 && retryCount < 3) {
            const retryAfter = parseInt(error.headers['retry-after'], 10) || 300;
            console.log(`Rate limit exceeded. Retrying in ${retryAfter} seconds.`);
            setTimeout(() => createFolderWithRetry(channelName, folder), retryAfter * 1000);
            retryCount++;
        } else {
            console.error(`Error creating folder: ${JSON.stringify(error)}`);
            throw error;
        }
    }
}

module.exports = {
    initializeDropbox,
    createFolder,
    createRootFolderForUser,
    createRootFolderWithFetch,
    createSharedLinkWithRetry,
    createFolderWithRetry,
    resetRetryCount
};