import { spawn } from 'child_process';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import net from 'net';

const rootDir = '/root/hyperlocal-marketplace';
const screenshotsDir = path.join(rootDir, 'tmp/screenshots');

// Ensure screenshots directory exists
fs.mkdirSync(screenshotsDir, { recursive: true });

function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - start > timeout) {
        clearInterval(timer);
        reject(new Error(`Timeout waiting for port ${port}`));
        return;
      }
      const socket = new net.Socket();
      socket.connect(port, '127.0.0.1');
      socket.on('connect', () => {
        socket.destroy();
        clearInterval(timer);
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
      });
    }, 500);
  });
}

async function run() {
  console.log('Starting server and client...');
  
  // Start server
  const serverProc = spawn('npm', ['run', 'dev', '-w', 'server'], {
    cwd: rootDir,
    env: { ...process.env, USE_MEMORY_STORE: 'true', PORT: '4000', CLIENT_ORIGIN: 'http://127.0.0.1:5000' }
  });
  
  // Start client
  const clientProc = spawn('npm', ['run', 'dev', '-w', 'client'], {
    cwd: rootDir,
    env: { ...process.env, PORT: '5000', VITE_API_URL: 'http://127.0.0.1:4000' }
  });

  // Log outputs to debug if needed
  serverProc.stdout.on('data', (data) => console.log(`[Server] ${data.toString().trim()}`));
  serverProc.stderr.on('data', (data) => console.error(`[Server Error] ${data.toString().trim()}`));
  clientProc.stdout.on('data', (data) => console.log(`[Client] ${data.toString().trim()}`));
  clientProc.stderr.on('data', (data) => console.error(`[Client Error] ${data.toString().trim()}`));

  try {
    console.log('Waiting for ports 4000 and 5000 to be ready...');
    await Promise.all([
      waitForPort(4000, 20000),
      waitForPort(5000, 20000)
    ]);
    console.log('Ports are ready! Launching browser...');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // Step 1: Browse Guest
    console.log('Step 1: Navigating to Browse (Guest)');
    await page.goto('http://127.0.0.1:5000');
    await page.waitForTimeout(3000); // Wait for animations and data fetch
    await page.screenshot({ path: path.join(screenshotsDir, '1_browse_guest.png') });

    // Step 2: Login as Seller
    console.log('Step 2: Logging in as Seller 1');
    await page.click('button:has-text("Login")');
    await page.waitForSelector('.modal-content');
    await page.fill('input[placeholder="jane@example.com"]', 'seller1@local.test');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.user-info');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '2_browse_authenticated.png') });

    // Step 3: Product Detail
    console.log('Step 3: Clicking first listing card for Detail view');
    await page.click('.listing-card');
    await page.waitForSelector('.detail-page');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '3_detail_page.png') });

    // Step 4: Sell Page
    console.log('Step 4: Navigating to Sell Page');
    await page.click('.topnav-item:has-text("Sell")');
    await page.waitForSelector('.form-container');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '4_sell_page.png') });

    // Step 5: Manage Page
    console.log('Step 5: Navigating to Manage Page');
    await page.click('.topnav-item:has-text("Manage")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '5_manage_page.png') });

    // Step 6: Log out and Log in as Admin for Admin panel
    console.log('Step 6: Logging out and logging in as Admin');
    await page.click('button:has-text("Sign Out")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Login")');
    await page.waitForSelector('.modal-content');
    await page.fill('input[placeholder="jane@example.com"]', 'admin@local.test');
    await page.fill('input[placeholder="••••••••"]', 'admin12345');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.user-info');
    await page.waitForTimeout(1000);

    console.log('Navigating to Admin Panel');
    await page.click('.topnav-item:has-text("Admin")');
    await page.waitForTimeout(3000); // Wait for data to load
    await page.screenshot({ path: path.join(screenshotsDir, '6_admin_dashboard.png') });

    console.log('Screenshots captured successfully!');
    await browser.close();

  } catch (err) {
    console.error('An error occurred during execution:', err);
  } finally {
    console.log('Cleaning up processes...');
    serverProc.kill('SIGINT');
    clientProc.kill('SIGINT');
    process.exit(0);
  }
}

run();
