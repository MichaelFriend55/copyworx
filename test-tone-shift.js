/**
 * Simple test script for the tone-shift API endpoint
 * Run with: node test-tone-shift.js
 */

const API_URL = 'http://localhost:3001/api/tone-shift';

// Test cases covering all four tones
const tests = [
  {
    name: 'Test 1: Professional Tone',
    body: {
      text: "Hey! Our sale ends soon so grab it while you can! It's seriously awesome!",
      tone: 'professional'
    }
  },
  {
    name: 'Test 2: Casual Tone',
    body: {
      text: 'We cordially invite you to attend our annual corporate symposium. Your presence would be greatly appreciated.',
      tone: 'casual'
    }
  },
  {
    name: 'Test 3: Urgent Tone',
    body: {
      text: 'Our new service is now available for your consideration at your earliest convenience.',
      tone: 'urgent'
    }
  },
  {
    name: 'Test 4: Friendly Tone',
    body: {
      text: 'Submit your application through our online portal. Processing times may vary.',
      tone: 'friendly'
    }
  },
  {
    name: 'Test 5: Error - Missing Text',
    body: {
      tone: 'professional'
    },
    expectError: true
  },
  {
    name: 'Test 6: Error - Invalid Tone',
    body: {
      text: 'Some copy here',
      tone: 'sarcastic'
    },
    expectError: true
  }
];

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${test.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Request body:', JSON.stringify(test.body, null, 2));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(test.body),
    });

    const data = await response.json();
    
    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    
    if (test.expectError) {
      if (!response.ok) {
        console.log('✅ Error test passed');
        console.log('Error response:', JSON.stringify(data, null, 2));
      } else {
        console.log('❌ Expected error but got success');
      }
    } else {
      if (response.ok) {
        console.log('✅ Test passed');
        console.log(`\nOriginal (${data.originalLength} chars):`);
        console.log(test.body.text);
        console.log(`\nRewritten (${data.newLength} chars):`);
        console.log(data.rewrittenText);
        console.log(`\nLength change: ${((data.newLength - data.originalLength) / data.originalLength * 100).toFixed(1)}%`);
      } else {
        console.log('❌ Test failed');
        console.log('Error response:', JSON.stringify(data, null, 2));
      }
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Tone Shift API Tests');
  console.log(`Testing endpoint: ${API_URL}\n`);
  
  for (const test of tests) {
    await runTest(test);
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('All tests completed!');
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
runAllTests().catch(console.error);
