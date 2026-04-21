# Beehiiv Newsletter Integration Setup

This guide explains how to set up Beehiiv integration for your newsletter signup functionality.

## Required Environment Variables

Add the following to your `.env.local` file:

```bash
# Beehiiv Newsletter Integration
BEEHIIV_API_KEY=your_beehiiv_api_key_here
BEEHIIV_PUBLICATION_ID=your_publication_id_here
```

## Getting Your Beehiiv Credentials

### 1. Get Your API Key
1. Log in to your [Beehiiv dashboard](https://app.beehiiv.com)
2. Go to **Settings** → **Integrations** → **API**
3. Create a new API key or copy your existing one
4. Add it as `BEEHIIV_API_KEY` in your environment variables

### 2. Get Your Publication ID
1. In your Beehiiv dashboard, go to your publication settings
2. The Publication ID can be found in the URL or settings section
3. It typically looks like: `pub_12345678-1234-1234-1234-123456789abc`
4. Add it as `BEEHIIV_PUBLICATION_ID` in your environment variables

## Features Implemented

- **Newsletter Signup**: Swedish-language newsletter landing page at `/nyhetsbrev`
- **Beehiiv Integration**: Automatic subscription via API
- **Error Handling**: Proper Swedish error messages
- **Duplicate Prevention**: Handles already-subscribed users gracefully
- **Welcome Emails**: Sends Beehiiv welcome emails automatically

## Navigation

The newsletter page is automatically added to your sidebar navigation. Users can access it via:
- Sidebar menu: "Nyhetsbrev"
- Direct URL: `/nyhetsbrev`

## Content Style

The newsletter landing page follows William Zinsser's writing principles:
- Clear, concise copy
- No jargon or pretentious language
- Direct, honest value propositions
- Focus on concrete benefits

## API Endpoint

The integration uses `/api/newsletter/subscribe` which:
- Validates email addresses
- Calls Beehiiv's subscription API
- Handles errors and duplicate subscriptions
- Returns appropriate Swedish messages

## Testing

1. Set up your environment variables
2. Visit `/nyhetsbrev` 
3. Enter an email address
4. Check your Beehiiv dashboard for the new subscriber
5. Verify welcome email delivery

## Troubleshooting

### Common Issues

1. **"Nyhetsbrev-tjänsten är inte konfigurerad"**
   - Check that both `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` are set

2. **"Du är redan prenumerant på vårt nyhetsbrev!"**
   - This is expected behavior for duplicate emails

3. **API errors**
   - Verify your API key has proper permissions
   - Check that your publication ID is correct
   - Ensure your Beehiiv account is active

### Log Debugging

API errors are logged to the console. Check your server logs for detailed error information from Beehiiv's API.