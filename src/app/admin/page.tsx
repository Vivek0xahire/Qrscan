"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Tag, Image as ImageIcon, Activity } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const [stats, setStats] = useState({ categories: 0, media: 0 })

  useEffect(() => {
    async function fetchStats() {
      const { count: cCount } = await supabase.from("categories").select("*", { count: 'exact', head: true })
      const { count: mCount } = await supabase.from("category_media").select("*", { count: 'exact', head: true })
      
      setStats({
        categories: cCount || 0,
        media: mCount || 0
      })
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/categories" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow group">
          <div className="p-4 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-gray-500 font-medium text-sm">Shop Sections</h2>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.categories}</p>
          </div>
        </Link>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow group">
          <div className="p-4 bg-pink-50 rounded-xl text-pink-600 group-hover:bg-pink-100 transition-colors">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-gray-500 font-medium text-sm">Media Uploads</h2>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.media}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Activity className="w-5 h-5 opacity-80" />
            System Status
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">All Systems Go</p>
            <p className="text-indigo-100 text-sm mt-1">Ready to manage shop sections.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
