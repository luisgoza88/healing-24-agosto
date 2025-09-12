// Script to check if realtime is enabled for credits tables
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRealtimeSettings() {
  console.log('Checking realtime settings for credits tables...\n');
  
  // This is just to test if we can subscribe
  const channel = supabase
    .channel('test-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patient_credits',
      },
      (payload) => {
        console.log('Received realtime event for patient_credits:', payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'credit_transactions',
      },
      (payload) => {
        console.log('Received realtime event for credit_transactions:', payload);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('\n✅ Successfully subscribed to realtime events');
        console.log('Realtime appears to be working for credits tables');
        
        // Clean up
        setTimeout(() => {
          supabase.removeChannel(channel);
          console.log('\nCleaned up test subscription');
          process.exit(0);
        }, 2000);
      }
    });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('\n❌ Subscription timeout - realtime might not be enabled');
    process.exit(1);
  }, 10000);
}

checkRealtimeSettings();