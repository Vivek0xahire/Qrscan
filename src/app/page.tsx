import Link from "next/link"
import { ArrowRight, QrCode } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mb-8">
          <QrCode className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Fabric Shop Manager
        </h1>
        
        <p className="text-lg text-gray-600">
          The smart way to manage your physical fabric store. Add fabrics, generate QR codes, and delight your mobile customers.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/admin" 
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            Go to Admin Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
