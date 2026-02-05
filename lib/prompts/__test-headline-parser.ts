/**
 * @file lib/prompts/__test-headline-parser.ts
 * @description Manual test cases for the robust headline parser
 * 
 * Run this with: npx ts-node lib/prompts/__test-headline-parser.ts
 * Or just inspect the test cases visually
 */

import { parseHeadlineResponse } from './headline-generator';

// ============================================================================
// Test Cases
// ============================================================================

console.log('🧪 Testing Headline Parser with Various Formats\n');
console.log('='.repeat(60));

// Test 1: Bullet format with •
const test1 = `
• Stop Losing Clients to Bad Follow-Up
• How to Close 3X More Deals in 30 Days
• Get More Leads Without Cold Calling
`;

console.log('\n📝 Test 1: Bullet format (•)');
console.log('Input:', test1.trim());
const result1 = parseHeadlineResponse(test1);
console.log('Parsed:', result1.length, 'headlines');
result1.forEach((h, i) => console.log(`  ${i + 1}. [${h.formula}] ${h.headline}`));

// Test 2: Numbered format
const test2 = `
1. Stop Losing Clients to Bad Follow-Up
2. How to Close 3X More Deals in 30 Days
3. Get More Leads Without Cold Calling
`;

console.log('\n📝 Test 2: Numbered format (1., 2., 3.)');
console.log('Input:', test2.trim());
const result2 = parseHeadlineResponse(test2);
console.log('Parsed:', result2.length, 'headlines');
result2.forEach((h, i) => console.log(`  ${i + 1}. [${h.formula}] ${h.headline}`));

// Test 3: Formula labels
const test3 = `
BENEFIT-DRIVEN:
Stop Losing Clients to Bad Follow-Up

HOW-TO:
How to Close 3X More Deals in 30 Days

PROBLEM-SOLUTION:
Get More Leads Without Cold Calling
`;

console.log('\n📝 Test 3: Formula labels (BENEFIT-DRIVEN:)');
console.log('Input:', test3.trim());
const result3 = parseHeadlineResponse(test3);
console.log('Parsed:', result3.length, 'headlines');
result3.forEach((h, i) => console.log(`  ${i + 1}. [${h.formula}] ${h.headline}`));

// Test 4: Mixed with preamble
const test4 = `
Here are your headlines:

• Stop Losing Clients to Bad Follow-Up
• How to Close 3X More Deals in 30 Days

Quality checklist:
✓ Respects character limits
✓ Uses distinct formulas

Note: These headlines are optimized for conversion.
`;

console.log('\n📝 Test 4: Mixed with preamble (should ignore preamble)');
console.log('Input:', test4.trim());
const result4 = parseHeadlineResponse(test4);
console.log('Parsed:', result4.length, 'headlines');
result4.forEach((h, i) => console.log(`  ${i + 1}. [${h.formula}] ${h.headline}`));

// Test 5: Inline formula labels with brackets
const test5 = `
[BENEFIT-DRIVEN]: Stop Losing Clients to Bad Follow-Up
[HOW-TO]: How to Close 3X More Deals in 30 Days
[SOCIAL PROOF]: Join 10,000+ Sales Teams Using This Method
`;

console.log('\n📝 Test 5: Inline formula labels with brackets');
console.log('Input:', test5.trim());
const result5 = parseHeadlineResponse(test5);
console.log('Parsed:', result5.length, 'headlines');
result5.forEach((h, i) => console.log(`  ${i + 1}. [${h.formula}] ${h.headline}`));

// Test 6: Expected format from current prompt
const test6 = `
BENEFIT-DRIVEN:
- Stop Losing Clients to Bad Follow-Up

CURIOSITY GAP:
- The Follow-Up Secret That Closes 3X More Deals

HOW-TO:
- How to Close More Deals in 30 Days Without Cold Calling
`;

console.log('\n📝 Test 6: Expected format with formula + dash bullets');
console.log('Input:', test6.trim());
const result6 = parseHeadlineResponse(test6);
console.log('Parsed:', result6.length, 'headlines');
result6.forEach((h, i) => console.log(`  ${i + 1}. [${h.formula}] ${h.headline}`));

// Test 7: Plain text (should work as fallback)
const test7 = `
Stop Losing Clients to Bad Follow-Up

How to Close 3X More Deals in 30 Days

Get More Leads Without Cold Calling
`;

console.log('\n📝 Test 7: Plain text (no bullets or numbers)');
console.log('Input:', test7.trim());
const result7 = parseHeadlineResponse(test7);
console.log('Parsed:', result7.length, 'headlines');
result7.forEach((h, i) => console.log(`  ${i + 1}. [${h.formula}] ${h.headline}`));

// Test 8: Mixed formats in same response
const test8 = `
BENEFIT-DRIVEN:
- Stop Losing Clients to Bad Follow-Up

2. How to Close 3X More Deals in 30 Days

• Get More Leads Without Cold Calling

[QUESTION]: Tired of Losing Deals to Competitors?

Transform Your Sales Team in 30 Days or Less
`;

console.log('\n📝 Test 8: Mixed formats (formulas, bullets, numbers, plain)');
console.log('Input:', test8.trim());
const result8 = parseHeadlineResponse(test8);
console.log('Parsed:', result8.length, 'headlines');
result8.forEach((h, i) => console.log(`  ${i + 1}. [${h.formula}] ${h.headline}`));

console.log('\n' + '='.repeat(60));
console.log('✅ Parser Test Complete!\n');
console.log('Summary:');
console.log('  Test 1 (bullets •):', result1.length, 'headlines');
console.log('  Test 2 (numbers):', result2.length, 'headlines');
console.log('  Test 3 (formulas):', result3.length, 'headlines');
console.log('  Test 4 (with preamble):', result4.length, 'headlines');
console.log('  Test 5 (inline brackets):', result5.length, 'headlines');
console.log('  Test 6 (expected format):', result6.length, 'headlines');
console.log('  Test 7 (plain text):', result7.length, 'headlines');
console.log('  Test 8 (mixed formats):', result8.length, 'headlines');
