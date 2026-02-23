/**
 * Test script for toolbar dropdown functionality
 * 
 * Instructions:
 * 1. Open http://localhost:3000/worxspace in your browser
 * 2. Open Developer Console (Cmd+Option+I on Mac)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run
 * 
 * This script will:
 * - Click in the editor
 * - Type test text
 * - Select all text
 * - Click the Font Family dropdown
 * - Report what it finds
 */

(async function testToolbarDropdown() {
  console.log('🧪 Starting Toolbar Dropdown Test...\n');
  
  // Helper to wait
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Step 1: Find and focus the editor
  console.log('Step 1: Finding editor...');
  const editor = document.querySelector('.ProseMirror');
  if (!editor) {
    console.error('❌ Editor not found!');
    return;
  }
  console.log('✅ Editor found:', editor);
  
  // Click and focus the editor
  editor.click();
  editor.focus();
  await wait(500);
  
  // Step 2: Type test text
  console.log('\nStep 2: Typing test text...');
  const testText = 'Testing toolbar formatting';
  editor.textContent = testText;
  
  // Trigger input event to update editor
  const inputEvent = new Event('input', { bubbles: true });
  editor.dispatchEvent(inputEvent);
  await wait(500);
  console.log('✅ Text typed:', testText);
  
  // Step 3: Select all text
  console.log('\nStep 3: Selecting all text...');
  const range = document.createRange();
  range.selectNodeContents(editor);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  await wait(500);
  console.log('✅ Text selected');
  
  // Step 4: Find the Font Family dropdown button
  console.log('\nStep 4: Finding Font Family dropdown...');
  
  // Look for button with "Font" text or title "Font Family"
  const buttons = Array.from(document.querySelectorAll('button'));
  const fontButton = buttons.find(btn => 
    btn.textContent.includes('Font') || 
    btn.title === 'Font Family' ||
    btn.querySelector('span')?.textContent.includes('Font')
  );
  
  if (!fontButton) {
    console.error('❌ Font Family button not found!');
    console.log('Available buttons:', buttons.map(b => ({
      text: b.textContent.trim().substring(0, 30),
      title: b.title,
      classes: b.className
    })));
    return;
  }
  
  console.log('✅ Font Family button found:', {
    text: fontButton.textContent.trim(),
    title: fontButton.title,
    classes: fontButton.className
  });
  
  // Step 5: Click the Font Family button
  console.log('\nStep 5: Clicking Font Family button...');
  fontButton.click();
  await wait(500);
  
  // Step 6: Check if dropdown appeared
  console.log('\nStep 6: Checking for dropdown menu...');
  
  // Look for dropdown menu elements
  const dropdownMenus = document.querySelectorAll('[class*="absolute"][class*="top-full"]');
  console.log('Found potential dropdown elements:', dropdownMenus.length);
  
  dropdownMenus.forEach((menu, index) => {
    console.log(`\nDropdown ${index + 1}:`, {
      visible: menu.offsetParent !== null,
      display: window.getComputedStyle(menu).display,
      visibility: window.getComputedStyle(menu).visibility,
      zIndex: window.getComputedStyle(menu).zIndex,
      position: window.getComputedStyle(menu).position,
      innerHTML: menu.innerHTML.substring(0, 200) + '...',
      classes: menu.className
    });
  });
  
  // Look for font options in the dropdown
  const fontOptions = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.match(/^(Arial|Helvetica|Georgia|Times New Roman|Courier New|Verdana)$/)
  );
  
  if (fontOptions.length > 0) {
    console.log('\n✅ Font options found in dropdown:', fontOptions.length);
    console.log('Available fonts:', fontOptions.map(opt => opt.textContent));
    
    // Step 7: Click Arial if found
    const arialOption = fontOptions.find(opt => opt.textContent === 'Arial');
    if (arialOption) {
      console.log('\nStep 7: Clicking Arial option...');
      arialOption.click();
      await wait(500);
      
      // Check if font was applied
      const editorStyle = window.getComputedStyle(editor);
      console.log('✅ Arial clicked. Editor font-family:', editorStyle.fontFamily);
      
      // Check TipTap editor state
      if (window.__tiptapEditor) {
        const attrs = window.__tiptapEditor.getAttributes('textStyle');
        console.log('TipTap textStyle attributes:', attrs);
      }
    }
  } else {
    console.error('❌ No font options found in dropdown!');
    console.log('This means the dropdown did not render properly.');
  }
  
  console.log('\n🏁 Test complete!');
  console.log('\nSummary:');
  console.log('- Editor found:', !!editor);
  console.log('- Text typed:', editor.textContent.includes(testText));
  console.log('- Font button found:', !!fontButton);
  console.log('- Dropdown appeared:', fontOptions.length > 0);
  console.log('- Font options count:', fontOptions.length);
  
})();
