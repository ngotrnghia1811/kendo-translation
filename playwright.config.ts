import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    globalSetup: require.resolve('./tests/global-setup.ts'),
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
    webServer: {
        command: 'npm run dev',
        url: process.env.TEST_BASE_URL || 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
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
