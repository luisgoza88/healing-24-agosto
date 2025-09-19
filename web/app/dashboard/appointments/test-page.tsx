'use client'

import { useEffect, useState } from 'react'
import { createClient, useSupabase } from '@/lib/supabase'

export default function TestAppointmentsPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  useEffect(() => {
    runTests()
  }, [])

  const runTests = async () => {
    const testResults: any = {}
    
    try {
      // Test 1: Basic appointments query
      console.log('Test 1: Basic appointments query')
      const { data: basicData, error: basicError } = await supabase
        .from('appointments')
        .select('*')
        .limit(5)
      
      testResults.basicQuery = {
        success: !basicError,
        count: basicData?.length || 0,
        error: basicError?.message || null,
        sample: basicData?.[0] || null
      }

      // Test 2: Check if user is authenticated
      console.log('Test 2: Check authentication')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      testResults.authentication = {
        success: !!user && !authError,
        userId: user?.id || null,
        email: user?.email || null,
        error: authError?.message || null
      }

      // Test 3: Query with simple foreign key
      console.log('Test 3: Query with professionals relation')
      const { data: profData, error: profError } = await supabase
        .from('appointments')
        .select('*, professionals(full_name)')
        .limit(5)
      
      testResults.professionalsRelation = {
        success: !profError,
        count: profData?.length || 0,
        error: profError?.message || null
      }

      // Test 4: Query with profiles relation
      console.log('Test 4: Query with profiles relation')
      const { data: profileData, error: profileError } = await supabase
        .from('appointments')
        .select('*, profiles(full_name, email)')
        .limit(5)
      
      testResults.profilesRelation = {
        success: !profileError,
        count: profileData?.length || 0,
        error: profileError?.message || null
      }

      // Test 5: Query with services relation
      console.log('Test 5: Query with services relation')
      const { data: serviceData, error: serviceError } = await supabase
        .from('appointments')
        .select('*, services(name)')
        .limit(5)
      
      testResults.servicesRelation = {
        success: !serviceError,
        count: serviceData?.length || 0,
        error: serviceError?.message || null
      }

      // Test 6: Check professionals table directly
      console.log('Test 6: Check professionals table')
      const { data: profs, error: profsError } = await supabase
        .from('professionals')
        .select('*')
        .limit(5)
      
      testResults.professionalsTable = {
        success: !profsError,
        count: profs?.length || 0,
        error: profsError?.message || null,
        sample: profs?.[0] || null
      }

      // Test 7: Check profiles table directly
      console.log('Test 7: Check profiles table')
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(5)
      
      testResults.profilesTable = {
        success: !profilesError,
        count: profiles?.length || 0,
        error: profilesError?.message || null,
        sample: profiles?.[0] || null
      }

      // Test 8: Check services table directly
      console.log('Test 8: Check services table')
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .limit(5)
      
      testResults.servicesTable = {
        success: !servicesError,
        count: services?.length || 0,
        error: servicesError?.message || null,
        sample: services?.[0] || null
      }

    } catch (error: any) {
      testResults.generalError = error.message
    }

    setResults(testResults)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Running Supabase Tests...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Supabase Appointments Test Results</h1>
      
      <div className="space-y-4">
        {Object.entries(results).map(([testName, result]: [string, any]) => (
          <div key={testName} className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">{testName}</h2>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}