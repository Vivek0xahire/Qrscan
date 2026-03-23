"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Category } from "@/lib/types"
import { Plus, Trash2, Edit2, Loader2, Tag } from "lucide-react"
import Link from "next/link"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = async () => {
    setLoading(true)
    const { data } = await supabase.from("categories").select("*").order("created_at", { ascending: false })
    if (data) setCategories(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the ${name} section completely?`)) return
    await supabase.from("categories").delete().eq("id", id)
    fetchCategories()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Shop Sections</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/categories/new"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Section
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No sections found. Add your first section mapping!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                  <th className="p-4 font-semibold">Section Name</th>
                  <th className="p-4 font-semibold text-right">Base Price</th>
                  <th className="p-4 font-semibold w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900 border-l-4 border-l-transparent hover:border-l-indigo-500 transition-all">
                      <Link href={`/admin/categories/${cat.id}`} className="hover:text-indigo-600 font-bold flex items-center gap-2">
                        <Tag className="w-4 h-4 text-indigo-400" /> {cat.name}
                      </Link>
                    </td>
                    <td className="p-4 text-right">
                      {cat.discount_price ? (
                        <div className="flex flex-col items-end">
                          <span className="text-gray-900 font-semibold">₹{cat.discount_price}</span>
                          <span className="text-xs text-gray-400 line-through">₹{cat.price}</span>
                        </div>
                      ) : (
                        <span className="text-gray-900 font-semibold">
                          {cat.price ? `₹${cat.price}` : '---'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <Link 
                        href={`/admin/categories/${cat.id}`}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit / Get QR Code / Upload Media"
                      >
                        <Edit2 className="w-5 h-5" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
