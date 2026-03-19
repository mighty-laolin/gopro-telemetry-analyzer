import { test, expect, Page } from '@playwright/test';
import path from 'path';

const VIDEO_FILE = path.join(process.cwd(), 'GX028700.MP4');

/**
 * Helper function to upload a video file and wait for dashboard to load
 */
export async function uploadVideoAndWaitForDashboard(page: Page, filePath: string = VIDEO_FILE): Promise<void> {
  // Upload the file
  await page.setInputFiles('input[type="file"]', filePath);
  
  // Wait for video element to appear (indicates processing complete)
  await expect(page.locator('video')).toBeVisible({ timeout: 120000 });
}

/**
 * Navigate to app and upload video
 */
export async function setupPageWithVideo(page: Page): Promise<void> {
  // Navigate to app
  await page.goto('http://localhost:3001');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  
  // Give app time to initialize
  await page.waitForTimeout(3000);
  
  // Check if there's already a video loaded by checking for the video element
  const videoVisible = await page.locator('video').isVisible().catch(() => false);
  const fileInputVisible = await page.locator('#file-input').isVisible().catch(() => false);
  
  if (!videoVisible && fileInputVisible) {
    // Need to upload video
    const VIDEO_FILE = path.join(process.cwd(), 'GX028700.MP4');
    
    // Upload file using page.setInputFiles (works with hidden inputs)
    await page.setInputFiles('#file-input', VIDEO_FILE);
    
    // Wait for video element to appear (indicates processing complete)
    await expect(page.locator('video')).toBeVisible({ timeout: 120000 });
  }
  
  // Wait for map to be ready
  await page.waitForTimeout(3000);
}
