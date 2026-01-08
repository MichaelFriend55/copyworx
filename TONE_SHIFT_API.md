# Tone Shift API Documentation

## Overview
The Tone Shift API endpoint allows you to rewrite copy in different tones using Claude AI while preserving the core message and improving clarity.

## Endpoint
```
POST /api/tone-shift
```

## Request Format

### Headers
```
Content-Type: application/json
```

### Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The copy to rewrite |
| `tone` | string | Yes | Target tone: `professional`, `casual`, `urgent`, or `friendly` |

### Example Request Body
```json
{
  "text": "Hey! Check out our new product. It's really cool and you should buy it now!",
  "tone": "professional"
}
```

## Response Format

### Success Response (200 OK)
```json
{
  "rewrittenText": "We are pleased to announce our latest product offering. We invite you to explore its features and consider how it might benefit your organization.",
  "originalLength": 82,
  "newLength": 145
}
```

### Error Responses

#### 400 Bad Request - Missing text
```json
{
  "error": "Missing or invalid \"text\" field",
  "details": "Please provide the copy to rewrite as a string in the \"text\" field"
}
```

#### 400 Bad Request - Missing tone
```json
{
  "error": "Missing or invalid \"tone\" field",
  "details": "Please provide a tone as one of: professional, casual, urgent, friendly"
}
```

#### 400 Bad Request - Invalid tone
```json
{
  "error": "Invalid tone value",
  "details": "Tone must be one of: professional, casual, urgent, friendly. Received: \"sarcastic\""
}
```

#### 500 Internal Server Error - API key not configured
```json
{
  "error": "Server configuration error",
  "details": "API key not configured. Please contact support."
}
```

#### 500 Internal Server Error - Claude API error
```json
{
  "error": "AI service error",
  "details": "Claude API error: [error message]"
}
```

## Testing the API

### Using cURL

#### Test 1: Professional Tone
```bash
curl -X POST http://localhost:3001/api/tone-shift \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hey! Our sale ends soon so grab it while you can!",
    "tone": "professional"
  }'
```

#### Test 2: Casual Tone
```bash
curl -X POST http://localhost:3001/api/tone-shift \
  -H "Content-Type: application/json" \
  -d '{
    "text": "We cordially invite you to attend our annual corporate symposium.",
    "tone": "casual"
  }'
```

#### Test 3: Urgent Tone
```bash
curl -X POST http://localhost:3001/api/tone-shift \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Our new service is now available for your consideration.",
    "tone": "urgent"
  }'
```

#### Test 4: Friendly Tone
```bash
curl -X POST http://localhost:3001/api/tone-shift \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Submit your application through our online portal.",
    "tone": "friendly"
  }'
```

### Using JavaScript (fetch)

```javascript
async function toneShift(text, tone) {
  const response = await fetch('/api/tone-shift', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, tone }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error);
  }

  const data = await response.json();
  return data.rewrittenText;
}

// Usage
try {
  const rewritten = await toneShift(
    'Hey! Check this out!',
    'professional'
  );
  console.log(rewritten);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Using Postman

1. Create a new POST request
2. Set URL: `http://localhost:3001/api/tone-shift`
3. Set Headers: `Content-Type: application/json`
4. Set Body (raw JSON):
   ```json
   {
     "text": "Your copy here",
     "tone": "professional"
   }
   ```
5. Click Send

## Tone Descriptions

### Professional
- Formal, polished, business-appropriate
- Authoritative and credible
- Uses industry terminology appropriately
- Clear and concise

**Example transformation:**
- Before: "Hey! We've got some cool new features!"
- After: "We are pleased to announce several new features designed to enhance your experience."

### Casual
- Conversational and friendly
- Relaxed and approachable
- Uses contractions and everyday language
- Feels like talking to a friend

**Example transformation:**
- Before: "We cordially invite you to our event."
- After: "You're invited to our event! We'd love to see you there."

### Urgent
- Time-sensitive and compelling
- Action-oriented language
- Creates FOMO (fear of missing out)
- Emphasizes immediate benefits

**Example transformation:**
- Before: "Our sale is available this week."
- After: "Last chance! Our sale ends in 48 hours. Don't miss out on these incredible savings!"

### Friendly
- Warm and welcoming
- Personable and builds rapport
- Inclusive language ("we", "together")
- Positive and upbeat

**Example transformation:**
- Before: "Submit your application."
- After: "We're excited to hear from you! Go ahead and send in your application whenever you're ready."

## Technical Details

### Model
- **Model:** `claude-sonnet-4-20250514`
- **Max Tokens:** 4,000
- **Provider:** Anthropic

### Rate Limits
⚠️ **Not yet implemented** - Future enhancement
- Planned: 50 requests per hour per user
- Will return 429 status when exceeded

### Caching
⚠️ **Not yet implemented** - Future enhancement
- Planned: Cache identical text+tone combinations
- TTL: 24 hours
- Storage: Redis/Vercel KV

### Cost Tracking
⚠️ **Not yet implemented** - Future enhancement
- Will log token usage per request
- Track costs per user
- Display in dashboard

## Environment Variables

Ensure `.env.local` contains:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Error Handling

The API includes comprehensive error handling:

1. **Validation Errors (400)**: Invalid input, missing fields, wrong tone
2. **Configuration Errors (500)**: Missing API key
3. **API Errors (500)**: Claude API failures
4. **Generic Errors (500)**: Unexpected failures

All errors return JSON with `error` and `details` fields for easy debugging.

## Logging

The API logs:
- ✅ Successful rewrites with length comparison
- ❌ Errors with full context
- 📝 Request previews (first 100 chars)

Check your terminal for detailed logs during development.

## Next Steps

### Integration with CopyWorx UI
1. Add a "Tone Shift" button to the editor toolbar
2. Show a dropdown with the 4 tone options
3. Display loading state while processing
4. Show before/after comparison
5. Allow user to accept or reject changes

### Future Enhancements
- [ ] Implement rate limiting
- [ ] Add response caching
- [ ] Track token usage/costs
- [ ] Add streaming for real-time results
- [ ] Support custom tones
- [ ] Batch processing for multiple blocks
- [ ] A/B testing results
- [ ] Save tone preferences per document

## Support

If you encounter issues:
1. Check that `ANTHROPIC_API_KEY` is set in `.env.local`
2. Verify the dev server is running on port 3001
3. Check terminal logs for detailed error messages
4. Ensure you have API credits in your Anthropic account

---

**Created:** January 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
