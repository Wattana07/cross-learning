/**
 * Export utilities for reports
 * Supports CSV and Excel (via CSV) exports
 */

// Export data to CSV
export function exportToCSV(
  data: any[],
  filename: string,
  headers?: string[]
): void {
  if (!data || data.length === 0) {
    alert('ไม่มีข้อมูลให้ Export')
    return
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    // Headers
    csvHeaders.map(h => `"${h}"`).join(','),
    // Data rows
    ...data.map(row =>
      csvHeaders
        .map(header => {
          const value = row[header] || ''
          // Escape quotes and wrap in quotes
          return `"${String(value).replace(/"/g, '""')}"`
        })
        .join(',')
    ),
  ].join('\n')

  // Add BOM for UTF-8 (for Excel to recognize Thai characters)
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  // Download
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export data to Excel (using CSV format with .xlsx extension)
// Note: This is actually CSV format but saved as .xlsx
// For true Excel format, would need xlsx library
export function exportToExcel(
  data: any[],
  filename: string,
  headers?: string[]
): void {
  // For now, use CSV format with .xlsx extension
  // Excel can open CSV files
  exportToCSV(data, filename, headers)
}

// Export table HTML to PDF using window.print()
export function exportToPDF(
  elementId: string,
  filename: string,
  title?: string
): void {
  const element = document.getElementById(elementId)
  if (!element) {
    alert('ไม่พบข้อมูลที่จะ Export')
    return
  }

  // Create a new window with the content
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('ไม่สามารถเปิดหน้าต่างใหม่ได้ กรุณาอนุญาต Pop-up')
    return
  }

  // Get element HTML and clean it up for better PDF rendering
  let elementHTML = element.innerHTML
  
  // Clean up Tailwind classes and convert to semantic HTML
  // Replace grid layouts
  elementHTML = elementHTML.replace(/grid grid-cols-[\w-]+/g, 'grid')
  // Replace card variants
  elementHTML = elementHTML.replace(/variant="[\w]+"/g, '')
  // Remove inline flex styles that break print
  elementHTML = elementHTML.replace(/style="[^"]*display:\s*flex[^"]*"/g, '')
  
  // Enhance cards with better classes
  elementHTML = elementHTML.replace(/class="([^"]*p-\d+[^"]*)"/g, (match, classes) => {
    return `class="${classes} card"`
  })
  
  // Enhance stat values
  elementHTML = elementHTML.replace(/<p class="[^"]*text-2xl[^"]*">([^<]+)<\/p>/g, '<p class="card-value">$1</p>')
  elementHTML = elementHTML.replace(/<p class="[^"]*text-sm[^"]*text-gray-600[^"]*">([^<]+)<\/p>/g, '<p class="card-label">$1</p>')
  
  // Enhance badges
  elementHTML = elementHTML.replace(/<span class="[^"]*badge[^"]*">([^<]+)<\/span>/gi, (match, content) => {
    return `<span class="badge badge-primary">${content}</span>`
  })

  // Create full HTML document with beautiful design
  const exportDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title || filename}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14pt;
            line-height: 1.7;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background: #f9fafb;
          }
          
          .container {
            max-width: 100%;
            margin: 0 auto;
            background: white;
            padding: 40px;
          }
          
          /* Header */
          .header {
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .header h1 {
            font-size: 32pt;
            font-weight: 700;
            margin: 0 0 10px 0;
            color: #1e40af;
            letter-spacing: -0.5px;
          }
          
          .header-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
          }
          
          .export-date {
            font-size: 11pt;
            color: #6b7280;
            font-weight: 500;
          }
          
          .logo-badge {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 10pt;
            font-weight: 600;
            display: inline-block;
          }
          
          /* Content */
          .content {
            margin-top: 30px;
          }
          
          /* Stats Cards */
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 25px 0;
          }
          
          .card {
            background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
          }
          
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
          }
          
          .card-label {
            font-size: 11pt;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .card-value {
            font-size: 28pt;
            font-weight: 700;
            color: #1f2937;
            margin: 8px 0;
            line-height: 1.2;
          }
          
          .card-icon {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          }
          
          /* Tables */
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 25px 0;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          }
          
          thead {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
          }
          
          th {
            padding: 14px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 12pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          tbody tr {
            border-bottom: 1px solid #f3f4f6;
            transition: background 0.2s;
          }
          
          tbody tr:last-child {
            border-bottom: none;
          }
          
          tbody tr:hover {
            background: #f9fafb;
          }
          
          tbody tr:nth-child(even) {
            background: #fafafa;
          }
          
          tbody tr:nth-child(even):hover {
            background: #f3f4f6;
          }
          
          td {
            padding: 14px 16px;
            font-size: 12pt;
            color: #374151;
          }
          
          /* Badges */
          .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 10pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .badge-primary {
            background: #dbeafe;
            color: #1e40af;
          }
          
          .badge-success {
            background: #d1fae5;
            color: #065f46;
          }
          
          .badge-danger {
            background: #fee2e2;
            color: #991b1b;
          }
          
          /* Sections */
          h2 {
            font-size: 20pt;
            font-weight: 600;
            color: #1f2937;
            margin: 35px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          h3 {
            font-size: 16pt;
            font-weight: 600;
            color: #374151;
            margin: 25px 0 15px 0;
          }
          
          /* Lists */
          .list-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          
          .list-item:last-child {
            border-bottom: none;
          }
          
          /* Footer */
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 10pt;
            color: #9ca3af;
          }
          
          /* Print styles */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .container {
              padding: 20px;
            }
            
            .no-print {
              display: none !important;
            }
            
            .card {
              page-break-inside: avoid;
            }
            
            table {
              page-break-inside: auto;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
          
          /* Clean up inline styles from copied HTML */
          [style*="display: flex"] {
            display: block !important;
          }
          
          [style*="grid"] {
            display: block !important;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title || 'รายงาน'}</h1>
            <div class="header-meta">
              <span class="export-date">📅 สร้างเมื่อ: ${exportDate}</span>
              <span class="logo-badge">Cross Learning Platform</span>
            </div>
          </div>
          <div class="content">
            ${elementHTML}
          </div>
          <div class="footer">
            <p>รายงานนี้ถูกสร้างอัตโนมัติจากระบบ Cross Learning Platform</p>
            <p>© ${new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </div>
      </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.focus()
    // Small delay to ensure fonts are loaded
    setTimeout(() => {
      printWindow.print()
    }, 100)
  }, 500)
}

// Format date for CSV/Excel
export function formatDateForExport(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// Format datetime for CSV/Excel
export function formatDateTimeForExport(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

