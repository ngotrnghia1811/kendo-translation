'use client'

import { useEffect, useState } from 'react'

interface UserInfo {
    id: string
    email: string
    username: string | null
    role: string
}

interface DocStats {
    total: number
    segmented: number
    fullyTranslated: number
}

export default function AdminPage() {
    const [users, setUsers] = useState<UserInfo[]>([])
    const [docStats, setDocStats] = useState<DocStats>({ total: 0, segmented: 0, fullyTranslated: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch users
                const usersRes = await fetch('/api/admin/users')
                if (usersRes.ok) {
                    const data = await usersRes.json()
                    setUsers(data.users || [])
                }

                // Fetch document stats
                const docsRes = await fetch('/api/documents')
                if (docsRes.ok) {
                    const data = await docsRes.json()
                    const docs = data.documents || []
                    setDocStats({
                        total: docs.length,
                        segmented: docs.filter((d: any) => d.segmented).length,
                        fullyTranslated: docs.filter((d: any) => d.progress?.percentage === 100).length,
                    })
                }
            } catch (error) {
                console.error('Error fetching admin data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h1>
                <div className="animate-pulse space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h1>

            {/* Stats cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-blue-600">{docStats.total}</div>
                    <div className="text-sm text-gray-500">Total Documents</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-green-600">{docStats.segmented}</div>
                    <div className="text-sm text-gray-500">Segmented</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-purple-600">{users.length}</div>
                    <div className="text-sm text-gray-500">Users</div>
                </div>
            </div>

            {/* Users table */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Users</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">User</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">ID</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700">
                                <td className="p-3 text-sm text-gray-900 dark:text-white">
                                    {user.username || 'No username'}
                                </td>
                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300 font-mono text-xs">{user.id.substring(0, 8)}...</td>
                                <td className="p-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                                        user.role === 'translator' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
