'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export default function DebugPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [authUsers, setAuthUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Cargar todos los perfiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        setError(`Error loading profiles: ${profilesError.message}`)
      } else {
        setProfiles(profilesData || [])
      }

      // Intentar cargar usuarios de auth (puede fallar por permisos)
      try {
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
        if (authError) {
          console.log('Cannot load auth users (expected):', authError)
          setAuthUsers([])
        } else {
          setAuthUsers(users || [])
        }
      } catch (e) {
        console.log('Auth admin not available (expected in client)')
        setAuthUsers([])
      }

    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Debug - Profiles Data</h1>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">
          Profiles Table ({profiles.length} records)
        </h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {profile.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{profile.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{profile.full_name || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{profile.phone || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {new Date(profile.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{profile.role || 'user'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {profiles.length === 0 && !loading && (
          <p className="text-center py-8 text-gray-500">No profiles found</p>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>Total profiles in database: {profiles.length}</li>
          <li>Latest profile created: {profiles[0]?.created_at ? new Date(profiles[0].created_at).toLocaleString() : 'N/A'}</li>
          <li>Profile IDs: {profiles.map(p => p.id.substring(0, 8)).join(', ')}</li>
        </ul>
      </div>
    </div>
  )
}