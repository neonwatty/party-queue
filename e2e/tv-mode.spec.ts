import { test, expect } from '@playwright/test'

test.describe('TV Mode', () => {
  // Run serially to avoid overwhelming the dev server during party creation
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Clear localStorage and create a party first
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Navigate to create party (use .first() since responsive layout renders two links)
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Wait for create page to load
    await expect(page.getByPlaceholder(/enter your display name/i)).toBeVisible({ timeout: 10000 })

    // Enter display name and create party
    await page.getByPlaceholder(/enter your display name/i).fill('Test Host')
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Wait for party room to load - look for party code
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })

  test('navigate to TV mode from party room', async ({ page }) => {
    // Find and click the TV mode button in the party header
    const tvButton = page.getByRole('button', { name: 'Open TV mode' })
    await expect(tvButton).toBeVisible()
    await tvButton.click()

    // Verify we navigated to the TV mode URL
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Verify TV mode page loads with its characteristic layout
    // The exit button should be visible
    await expect(page.getByRole('button', { name: 'Exit TV mode' })).toBeVisible()
  })

  test('TV mode shows party code', async ({ page }) => {
    // Get the party code from the party room before navigating
    const partyCode = await page.getByTestId('party-code').textContent()

    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // The party code should be displayed in the TV mode bottom bar
    await expect(page.getByText(partyCode!)).toBeVisible()
  })

  test('TV mode shows current content in mock mode', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // In mock mode, the first item has status 'showing' and is a note:
    // "Remember to bring snacks for the party!"
    // The "NOW SHOWING" indicator should be visible
    await expect(page.getByText('NOW SHOWING')).toBeVisible()

    // The mock note content should be displayed in the content area (paragraph element)
    // Use getByRole('paragraph') to target the note content display, not the title bar
    await expect(
      page.getByRole('paragraph').filter({ hasText: 'Remember to bring snacks for the party!' }),
    ).toBeVisible()
  })

  test('TV mode shows host controls (Show Next button)', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Host should see the "Show next item" button since there are pending items in mock mode
    const nextButton = page.getByRole('button', { name: 'Show next item' })
    await expect(nextButton).toBeVisible()
  })

  test('TV mode shows Up Next section with pending items', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Mock mode has 3 pending items, so Up Next section should be visible
    await expect(page.getByText('UP NEXT')).toBeVisible()
  })

  test('exit TV mode returns to party room', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Click the exit button
    await page.getByRole('button', { name: 'Exit TV mode' }).click()

    // Should return to the party room (URL without /tv, may have trailing slash)
    await expect(page).toHaveURL(/\/party\/[^/]+\/?$/, { timeout: 10000 })

    // Party code should be visible again in the party room
    await expect(page.getByTestId('party-code')).toBeVisible()
  })

  test('TV mode URL structure works with direct navigation', async ({ page }) => {
    // Extract the party ID from the current URL
    const partyRoomUrl = page.url()
    const tvUrl = partyRoomUrl + '/tv'

    // Navigate directly to the TV mode URL
    await page.goto(tvUrl)

    // TV mode should load - verify exit button is present
    await expect(page.getByRole('button', { name: 'Exit TV mode' })).toBeVisible({ timeout: 10000 })

    // "NOW SHOWING" indicator should be visible
    await expect(page.getByText('NOW SHOWING')).toBeVisible()
  })

  test('Show Next button advances the queue', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Verify the first mock note is showing (use heading which is the Now Showing title)
    await expect(page.getByRole('heading', { name: 'Remember to bring snacks for the party!' })).toBeVisible()

    // Click the Next button to advance
    await page.getByRole('button', { name: 'Show next item' }).click()

    // After advancing, the next pending note should now be showing
    // The first pending mock note is "First test note for removal"
    await expect(page.getByRole('heading', { name: 'First test note for removal' })).toBeVisible({ timeout: 5000 })

    // The original note should no longer be visible (it gets status 'shown' and is filtered out)
    await expect(page.getByRole('heading', { name: 'Remember to bring snacks for the party!' })).not.toBeVisible()
  })

  test('TV mode displays member count', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // In mock mode there is 1 member - the bottom bar shows the count next to the users icon
    // Target the party info bar area at the bottom which contains the party code and member count
    const partyInfoBar = page.locator('.border-t.border-white\\/10')
    await expect(partyInfoBar).toBeVisible()

    // The member count span should contain "1"
    const memberCount = partyInfoBar.locator('span').filter({ hasText: /^1$/ })
    await expect(memberCount).toBeVisible()
  })

  test('TV mode has black background', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Verify the root container has a black background (bg-black class)
    const rootDiv = page.locator('.min-h-screen.bg-black')
    await expect(rootDiv).toBeVisible()
  })
})
