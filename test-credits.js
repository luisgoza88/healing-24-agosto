// Test script to check if credits are being generated correctly
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCreditsForUser(userId) {
  console.log(`\nChecking credits for user: ${userId}\n`);
  
  try {
    // Check patient_credits table
    const { data: credits, error: creditsError } = await supabase
      .from('patient_credits')
      .select('*')
      .eq('patient_id', userId)
      .single();
    
    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('Error fetching credits:', creditsError);
    } else if (credits) {
      console.log('Current credits:', credits);
    } else {
      console.log('No credits record found for this user');
    }
    
    // Check recent transactions
    const { data: transactions, error: transError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (transError) {
      console.error('Error fetching transactions:', transError);
    } else if (transactions && transactions.length > 0) {
      console.log('\nRecent transactions:');
      transactions.forEach(t => {
        console.log(`- ${t.created_at}: ${t.description} - Amount: ${t.amount}`);
      });
    } else {
      console.log('No transactions found');
    }
    
    // Check appointments with credits
    const { data: appointments, error: appError } = await supabase
      .from('appointments')
      .select('id, appointment_date, status, payment_status, credits_generated, credit_amount')
      .eq('user_id', userId)
      .eq('credits_generated', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (appError) {
      console.error('Error fetching appointments:', appError);
    } else if (appointments && appointments.length > 0) {
      console.log('\nAppointments with credits:');
      appointments.forEach(a => {
        console.log(`- ${a.appointment_date}: Status: ${a.status}, Payment: ${a.payment_status}, Credit: ${a.credit_amount}`);
      });
    } else {
      console.log('No appointments with credits found');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Replace with the actual user ID you want to test
const USER_ID_TO_TEST = 'YOUR_USER_ID_HERE';

console.log('Credits Test Script');
console.log('==================');

// You can pass the user ID as a command line argument
const userId = process.argv[2] || USER_ID_TO_TEST;

if (userId === 'YOUR_USER_ID_HERE') {
  console.error('Please provide a user ID as a command line argument');
  console.log('Usage: node test-credits.js USER_ID');
  process.exit(1);
}

testCreditsForUser(userId).then(() => {
  console.log('\nTest completed');
  process.exit(0);
});