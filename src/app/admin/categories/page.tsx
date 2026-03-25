"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Category } from "@/lib/types"
import { Plus, Trash2, Edit2, Loader2, Tag, Download, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import jsPDF from "jspdf"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [batching, setBatching] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)

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

  const downloadAllQRs = async () => {
    if (categories.length === 0) return
    setBatching(true)
    setBatchProgress(0)
    
    const zip = new JSZip()
    const folder = zip.folder("Fabric_QRCodes")
    
    // Helper for wrapping text
    const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = context.measureText(currentLine + " " + word).width;
            if (width < maxWidth) currentLine += " " + word;
            else { lines.push(currentLine); currentLine = word; }
        }
        lines.push(currentLine);
        return lines;
    };

    const generateQRCanvas = (cat: Category): Promise<{ blob: Blob, canvas: HTMLCanvasElement }> => {
        return new Promise((resolve) => {
            const svg = document.getElementById(`batch-qr-${cat.id}`) as any
            const svgData = new XMLSerializer().serializeToString(svg)
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            const img = new Image()
            const scale = 12 // Super high resolution for ultra-sharp prints
            
            img.onload = () => {
                const qrSize = img.width * scale
                const padding = 50 * scale
                const fontSize = 16 * scale
                const lineHeight = fontSize * 1.4
                const note = cat.qr_note || `${cat.name} - Scan & View`
                
                if (ctx) {
                    ctx.font = `bold ${fontSize}px sans-serif`
                    const lines = wrapText(ctx, note, qrSize + padding)
                    const textSpace = lines.length * lineHeight + (20 * scale)
                    
                    canvas.width = qrSize + (padding * 2)
                    canvas.height = qrSize + (padding * 2) + textSpace
                    
                    ctx.fillStyle = "white"
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                    
                    ctx.fillStyle = "black"
                    ctx.font = `bold ${fontSize}px sans-serif`
                    ctx.textAlign = "center"
                    ctx.textBaseline = "top"
                    
                    lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, padding + (i * lineHeight)))
                    
                    ctx.strokeStyle = "black"
                    ctx.lineWidth = 8
                    ctx.strokeRect(0, 0, canvas.width, canvas.height)
                    
                    ctx.drawImage(img, padding, padding + textSpace, qrSize, qrSize)
                    
                    canvas.toBlob((blob) => resolve({ blob: blob!, canvas }), "image/png", 1.0)
                }
            }
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData)
        })
    }

    const generatedItems = []
    const pvcFolder = zip.folder("PVC_Cards_PDF")
    
    for (let i = 0; i < categories.length; i++) {
        const cat = categories[i]
        const data = await generateQRCanvas(cat)
        folder?.file(`${cat.name.replace(/[^a-z0-9]/gi, '_')}.png`, data.blob)
        generatedItems.push(data.canvas)
        
        // PVC Card PDF Generation (CR80 Standard size: 54mm x 86mm)
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] })
        const imgData = data.canvas.toDataURL("image/png", 1.0)
        const pdfScale = Math.min(50 / data.canvas.width, 82 / data.canvas.height) // 2mm margin
        const drawW = data.canvas.width * pdfScale
        const drawH = data.canvas.height * pdfScale
        const dx = (54 - drawW) / 2
        const dy = (86 - drawH) / 2
        
        pdf.addImage(imgData, 'PNG', dx, dy, drawW, drawH)
        pvcFolder?.file(`${cat.name.replace(/[^a-z0-9]/gi, '_')}_PVC.pdf`, pdf.output('blob'))
        
        setBatchProgress(Math.round(((i + 1) / categories.length) * 50))
    }

    // Create Print Pages (600 DPI for Extreme Clarity)
    const A4_WIDTH = 7016 // 600 DPI Landscape A4
    const A4_HEIGHT = 4960
    const columns = 4
    const rows = 2
    const itemsPerPage = columns * rows
    const pages = Math.ceil(generatedItems.length / itemsPerPage)
    
    const printFolder = zip.folder("Print_Ready_Pages")
    
    for (let p = 0; p < pages; p++) {
        const pageCanvas = document.createElement("canvas")
        pageCanvas.width = A4_WIDTH
        pageCanvas.height = A4_HEIGHT
        const pCtx = pageCanvas.getContext("2d")
        if (!pCtx) continue
        
        // white bg
        pCtx.fillStyle = "white"
        pCtx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT)
        
        // Setup dotted lines for cutting
        pCtx.strokeStyle = "#999"
        pCtx.lineWidth = 6
        pCtx.setLineDash([30, 20])
        
        const cellWidth = A4_WIDTH / columns
        const cellHeight = A4_HEIGHT / rows
        
        // Draw grid lines
        for (let c = 1; c < columns; c++) {
            pCtx.beginPath()
            pCtx.moveTo(c * cellWidth, 0)
            pCtx.lineTo(c * cellWidth, A4_HEIGHT)
            pCtx.stroke()
        }
        for (let r = 1; r < rows; r++) {
            pCtx.beginPath()
            pCtx.moveTo(0, r * cellHeight)
            pCtx.lineTo(A4_WIDTH, r * cellHeight)
            pCtx.stroke()
        }
        
        pCtx.setLineDash([]) // reset
        
        // Draw QRs inside grid
        for (let i = 0; i < itemsPerPage; i++) {
            const index = p * itemsPerPage + i
            if (index >= generatedItems.length) break
            
            const qrCanvas = generatedItems[index]
            const r = Math.floor(i / columns)
            const c = i % columns
            
            const margin = 20 // minimal margin for maximum size
            const availW = cellWidth - margin * 2
            const availH = cellHeight - margin * 2
            const scale = Math.min(availW / qrCanvas.width, availH / qrCanvas.height)
            
            const drawW = qrCanvas.width * scale
            const drawH = qrCanvas.height * scale
            const dx = c * cellWidth + (cellWidth - drawW) / 2
            const dy = r * cellHeight + (cellHeight - drawH) / 2
            
            pCtx.drawImage(qrCanvas, dx, dy, drawW, drawH)
        }
        
        const blob = await new Promise<Blob>((res) => pageCanvas.toBlob((b) => res(b!), "image/png", 1.0))
        printFolder?.file(`Print_Page_${p + 1}.png`, blob)
        setBatchProgress(50 + Math.round(((p + 1) / pages) * 50))
    }

    const content = await zip.generateAsync({ type: "blob" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(content)
    link.download = "Shop_Fabric_QRs.zip"
    link.click()
    
    setBatching(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Shop Sections</h1>
        <div className="flex gap-3">
          <button
            onClick={downloadAllQRs}
            disabled={batching || categories.length === 0}
            className="px-6 py-2.5 bg-white border-2 border-indigo-100 hover:border-indigo-600 text-indigo-700 rounded-lg flex items-center justify-center gap-2 font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {batching ? (
               <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing ({batchProgress}%)
               </>
            ) : (
              <>
                <Download className="w-5 h-5 text-indigo-500" />
                Batch QR Download (.zip)
              </>
            )}
          </button>
          <Link
            href="/admin/categories/new"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Section
          </Link>
        </div>
      </div>

      {/* Hidden QR codes for background batch processing */}
      <div className="hidden pointer-events-none opacity-0 overflow-hidden" style={{ height: 0 }}>
        {typeof window !== 'undefined' && categories.map(cat => (
          <QRCodeSVG 
            key={cat.id} 
            id={`batch-qr-${cat.id}`} 
            value={`${window.location.origin}/category/${cat.id}`} 
            size={256} 
            level="H" 
            fgColor={cat.qr_color || "#1e1e2f"}
          />
        ))}
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
