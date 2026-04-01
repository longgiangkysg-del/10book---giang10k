// Test Edge Function directly
const url = 'https://luhgjdvorwgridljhoar.supabase.co/functions/v1/dynamic-responder';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1aGdqZHZvcndncmlkbGpob2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODUyMzMsImV4cCI6MjA4MjA2MTIzM30.Hgmjm_rAnPnHUdHaQxImOd1-SMKTiXzeerREaqnavKk';

async function test() {
    console.log('=== Test: Anon key as Bearer ===');
    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + anonKey,
                'apikey': anonKey,
            },
            body: JSON.stringify({ bookTitle: 'Test', author: 'Test', agentType: 'meta' }),
        });
        const t = await r.text();
        console.log('Status:', r.status);
        console.log('Body:', t.substring(0, 500));
    } catch (e) {
        console.log('Error:', e.message);
    }
}

test();
