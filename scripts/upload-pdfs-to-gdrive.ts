#!/usr/bin/env npx tsx
/**
 * scripts/upload-pdfs-to-gdrive.ts
 *
 * Uploads all local `*_paired.pdf` files to Google Drive using OAuth2
 * (user credentials). Writes a mapping of relative-path → GDrive file ID
 * to `.tmp/gdrive-ids.json` for consumption by `link-gdrive-pdfs.ts`.
 *
 * Usage:
 *   npx tsx scripts/upload-pdfs-to-gdrive.ts --dry-run
 *   npx tsx scripts/upload-pdfs-to-gdrive.ts
 *
 * Requirements:
 *   GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET must be set
 *   (or loaded from .env.local).
 */

import fs from 'fs'
import path from 'path'
import { google, drive_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

// ---------------------------------------------------------------------------
// Load .env.local manually (avoid dotenv dependency — match link-paired-pdfs.ts)
// ---------------------------------------------------------------------------
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (m && !process.env[m[1]]) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
        }
    }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PDF_BASE_PATH =
    process.env.PDF_BASE_PATH ??
    '/Users/nghiango-mbp/git_repo/universal-agent_v2/book-postprocessing'

const CLIENT_ID = process.env.GDRIVE_CLIENT_ID
const CLIENT_SECRET = process.env.GDRIVE_CLIENT_SECRET
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET are required')
    process.exit(1)
}

const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'
const TOKEN_PATH = path.resolve(process.cwd(), '.gdrive-token.json')
const OUTPUT_PATH = path.resolve(process.cwd(), '.tmp/gdrive-ids.json')
const FOLDER_NAME = 'kendo-translation-pdfs'

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SKIP_EXISTING = !args.includes('--no-skip-existing') // default true

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escalate from raw token data to an OAuth2 client. */
function getOAuth2Client(raw: Record<string, unknown>): OAuth2Client {
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI,
    )
    oauth2Client.setCredentials(raw as any)
    return oauth2Client
}

/**
 * Interactive OAuth2 authorisation (copy-paste flow).
 * Returns an authenticated OAuth2 client.
 */
async function authorize(): Promise<OAuth2Client> {
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI,
    )

    // Try cached token first
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const raw = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
            const client = getOAuth2Client(raw)
            // Ensure the token is still fresh / refresh it if needed
            await client.getAccessToken()
            console.log('✓ Reused cached OAuth2 token from .gdrive-token.json')
            return client
        } catch {
            console.warn('Cached token invalid or expired — re-authorising...')
        }
    }

    // Fresh authorisation
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
    })
    console.log('\nAuthorise this app by visiting this URL:\n')
    console.log(authUrl)
    console.log('\nThen paste the authorisation code below:')
    console.log('(paste the code and press Enter)\n')

    const readline = await import('readline')
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const code = await new Promise<string>((resolve) => {
        rl.question('> ', (answer: string) => {
            rl.close()
            resolve(answer.trim())
        })
    })

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Persist
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf-8')
    console.log('✓ Token saved to .gdrive-token.json')

    return oauth2Client
}

/**
 * Find (or create) the GDrive folder `kendo-translation-pdfs`.
 * Returns the folder ID.
 */
async function findOrCreateFolder(
    drive: drive_v3.Drive,
): Promise<string> {
    // Search by name
    const res = await drive.files.list({
        q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
    })
    if (res.data.files && res.data.files.length > 0) {
        const id = res.data.files[0].id!
        console.log(`✓ Found existing folder "${FOLDER_NAME}" (${id})`)
        return id
    }

    // Create
    if (DRY_RUN) {
        console.log(`[DRY-RUN] Would create folder "${FOLDER_NAME}"`)
        return 'dry-run-folder-id'
    }

    const created = await drive.files.create({
        requestBody: {
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
    })
    const id = created.data.id!
    console.log(`✓ Created folder "${FOLDER_NAME}" (${id})`)
    return id
}

/**
 * List existing files in the folder so we can skip re-uploads.
 */
async function listExistingFiles(
    drive: drive_v3.Drive,
    folderId: string,
): Promise<Map<string, string>> {
    const nameToId = new Map<string, string>()
    let pageToken: string | undefined
    do {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'nextPageToken, files(id, name)',
            pageToken,
        } as any)
        for (const f of res.data.files ?? []) {
            if (f.name) nameToId.set(f.name, f.id!)
        }
        pageToken = (res.data as any).nextPageToken ?? undefined
    } while (pageToken)
    return nameToId
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    const auth = await authorize()
    const drive = google.drive({ version: 'v3', auth })

    // 1. Find / create folder
    const folderId = await findOrCreateFolder(drive)

    // 2. Scan local PDFs
    const entries = fs.readdirSync(PDF_BASE_PATH, { withFileTypes: true })
    const pdfFiles: { dir: string; relPath: string; absPath: string }[] = []
    for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const dir = entry.name
        const candidate = path.join(PDF_BASE_PATH, dir, `${dir}_paired.pdf`)
        if (fs.existsSync(candidate)) {
            pdfFiles.push({
                dir,
                relPath: `${dir}/${dir}_paired.pdf`,
                absPath: candidate,
            })
        }
    }
    console.log(`\nFound ${pdfFiles.length} paired PDFs in ${PDF_BASE_PATH}`)

    // 3. List existing files in the folder for skip check
    let existingFiles: Map<string, string>
    if (SKIP_EXISTING && !DRY_RUN) {
        existingFiles = await listExistingFiles(drive, folderId)
        console.log(`Found ${existingFiles.size} existing files in GDrive folder`)
    } else {
        existingFiles = new Map()
    }

    // 4. Upload / skip
    const results: Record<string, string> = {}
    let uploaded = 0
    let skipped = 0

    for (const { relPath, absPath } of pdfFiles) {
        const fileName = path.basename(relPath)

        // Check if already in folder
        const existingId = existingFiles.get(fileName)
        if (existingId && SKIP_EXISTING) {
            console.log(`  ⏭ ${relPath} (already in GDrive: ${existingId})`)
            results[relPath] = existingId
            skipped++
            continue
        }

        if (DRY_RUN) {
            console.log(`  [DRY-RUN] Would upload ${relPath}`)
            results[relPath] = 'dry-run-file-id'
            continue
        }

        // Upload
        console.log(`  ↑ Uploading ${relPath} ...`)
        const media = {
            mimeType: 'application/pdf' as const,
            body: fs.createReadStream(absPath),
        }
        const file = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
                mimeType: 'application/pdf',
            },
            media,
            fields: 'id',
        })
        const fileId = file.data.id!
        results[relPath] = fileId

        // Set sharing to "anyone with link can view"
        await drive.permissions.create({
            fileId,
            requestBody: { role: 'reader', type: 'anyone' },
        })
        uploaded++
        console.log(`    ✓ ${fileId} (shared publicly)`)
    }

    // 5. Write results
    if (!DRY_RUN) {
        // Ensure .tmp dir exists
        const outDir = path.dirname(OUTPUT_PATH)
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true })
        }
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2) + '\n', 'utf-8')
        console.log(`\n✓ Wrote ${Object.keys(results).length} entries to ${OUTPUT_PATH}`)
    } else {
        console.log(`\n[DRY-RUN] Would write ${Object.keys(results).length} entries to ${OUTPUT_PATH}`)
    }

    console.log(`\nSummary: ${uploaded} uploaded, ${skipped} skipped, ${pdfFiles.length} total`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
