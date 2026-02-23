/**
 * Test script for toolbar formatting buttons
 * Captures console output with DIAG messages
 */

const puppeteer = require('puppeteer');

async function testToolbar() {
  console.log('🚀 Starting toolbar test...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    
    // Print DIAG and SELF-TEST messages immediately
    if (text.includes('DIAG') || text.includes('SELF-TEST') || text.includes('Error')) {
      console.log(`📋 Console: ${text}`);
    }
  });
  
  try {
    console.log('📍 Navigating to http://localhost:3000/worxspace...');
    await page.goto('http://localhost:3000/worxspace', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // Check current URL for auth redirect
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}\n`);
    
    if (currentUrl.includes('sign-in') || currentUrl.includes('auth') || currentUrl.includes('clerk')) {
      console.log('🔒 REDIRECTED TO SIGN-IN PAGE');
      console.log('⚠️  Authentication required. Stopping test.\n');
      await browser.close();
      return;
    }
    
    console.log('✅ Workspace loaded successfully!\n');
    console.log('⏳ Waiting 5 seconds for page initialization...');
    await page.waitForTimeout(5000);
    
    // Check for initial console output
    console.log('\n📊 Initial console output:');
    const diagMessages = consoleMessages.filter(msg => 
      msg.includes('DIAG') || msg.includes('SELF-TEST')
    );
    if (diagMessages.length > 0) {
      diagMessages.forEach(msg => console.log(`  ${msg}`));
    } else {
      console.log('  (No DIAG messages yet)');
    }
    
    // Look for editor area
    console.log('\n🔍 Looking for text editor...');
    const editorSelector = '.tiptap-editor .ProseMirror, [contenteditable="true"]';
    await page.waitForSelector(editorSelector, { timeout: 5000 });
    console.log('✅ Editor found!');
    
    // Type test text
    console.log('⌨️  Typing test text...');
    await page.click(editorSelector);
    await page.type(editorSelector, 'Testing toolbar buttons');
    await page.waitForTimeout(500);
    
    // Select all text
    console.log('🖱️  Selecting all text (Ctrl+A)...');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.waitForTimeout(500);
    
    // Look for Bold button
    console.log('🔍 Looking for Bold button...');
    const boldButtonSelector = 'button[title*="Bold"]';
    const boldButton = await page.$(boldButtonSelector);
    
    if (boldButton) {
      console.log('✅ Bold button found! Clicking...');
      await boldButton.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️  Bold button not found');
    }
    
    // Check console output after clicking
    console.log('\n📊 Console output after Bold click:');
    const newDiagMessages = consoleMessages.filter(msg => 
      msg.includes('DIAG') || msg.includes('SELF-TEST') || msg.includes('Error')
    );
    
    if (newDiagMessages.length > 0) {
      console.log('\n=== ALL DIAGNOSTIC CONSOLE OUTPUT ===');
      newDiagMessages.forEach(msg => console.log(msg));
      console.log('=== END DIAGNOSTIC OUTPUT ===\n');
    } else {
      console.log('  (No DIAG messages captured)');
    }
    
    // Check if text is actually bold
    const isBold = await page.evaluate(() => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === 3 ? container.parentElement : container;
        const fontWeight = window.getComputedStyle(element).fontWeight;
        return parseInt(fontWeight) >= 600 || element.querySelector('strong') !== null;
      }
      return false;
    });
    
    console.log(`\n📝 Text is bold: ${isBold ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n✅ Test completed! Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Test finished.');
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testToolbar().catch(console.error);
} catch (e) {
  console.error('❌ Puppeteer not installed.');
  console.error('📦 Install it with: npm install puppeteer');
  console.error('   or use: npx puppeteer@latest');
}
