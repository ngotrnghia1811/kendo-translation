import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: false,
    retries: 1,
    workers: 1,
    reporter: [
        ['html', { outputFolder: 'test-results/report', open: 'never' }],
        ['list'],
    ],
    outputDir: 'test-results/artifacts',
    use: {
        baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
        screenshot: 'on',
        video: 'retain-on-failure',
        trace: 'on',
        // Use Firefox channel since Camoufox is Firefox-based
        // In tests we use Camoufox directly via fixture; this fallback covers CI
        browserName: 'firefox',
    },
    projects: [
        {
            name: 'camoufox',
            use: {
                ...devices['Desktop Firefox'],
                screenshot: 'on',
            },
        },
    ],
})
