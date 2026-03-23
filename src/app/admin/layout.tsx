"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LayoutDashboard, Tag, ShoppingBag, LogOut, Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react"

// Simple PIN security from environment variable
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234" // Default 1234 if not set

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [error, setError] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check session on load
  useEffect(() => {
    const authStatus = sessionStorage.getItem("admin_auth") === "true"
    setIsAuthenticated(authStatus)
    setChecking(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput === ADMIN_PIN) {
      sessionStorage.setItem("admin_auth", "true")
      setIsAuthenticated(true)
      setError(false)
    } else {
      setError(true)
      setPinInput("")
      // Shake animation effect
      setTimeout(() => setError(false), 500)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth")
    setIsAuthenticated(false)
    setPinInput("")
  }

  if (checking) return null

  // If not authenticated, show beautiful login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-6 font-sans">
        <div className={`bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-4 border-indigo-100/50 max-w-[420px] w-full text-center transition-all ${error ? 'animate-shake' : ''}`}>
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200 anim-bounce-in">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Admin Security</h1>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed">Enter your master PIN to access the dashboard</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <input
                type={showPin ? "text" : "password"}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN"
                className={`w-full py-5 px-8 rounded-2xl bg-gray-50 border-2 text-center text-3xl font-bold tracking-[0.5em] transition-all focus:outline-none focus:ring-4 ${error ? 'border-red-400 focus:ring-red-100 text-red-600' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-100 text-gray-900'}`}
                autoFocus
                maxLength={8}
              />
              <button 
                type="button" 
                onClick={() => setShowPin(!showPin)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-2"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <p className="text-red-500 font-bold bg-red-50 py-2 rounded-lg text-sm animate-fade-in">❌ Incorrect PIN. Please try again.</p>
            )}

            <button
              type="submit"
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all text-xl flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              Verify & Unlock <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-12 flex items-center justify-center gap-2 text-gray-400 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Secure Admin Terminal</span>
          </div>
        </div>
      </div>
    )
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Manage Sections", href: "/admin/categories", icon: Tag },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-indigo-600" />
          <span className="font-bold text-xl tracking-tight text-gray-900">Admin</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Lock Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
