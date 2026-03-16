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
  await page.goto('http://localhost:3001');
  await expect(page.locator('text=Drop your GoPro MP4 file here')).toBeVisible();
  await uploadVideoAndWaitForDashboard(page);
}
