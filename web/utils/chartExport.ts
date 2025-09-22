import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportChartAsImage(elementId: string, filename: string = 'chart') {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      logging: false,
    });

    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = url;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
    });
  } catch (error) {
    console.error('Error exporting chart as image:', error);
    throw error;
  }
}

export async function exportChartAsPDF(elementId: string, filename: string = 'chart') {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    });

    // Calculate dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting chart as PDF:', error);
    throw error;
  }
}

export function exportChartData(data: any[], filename: string = 'data') {
  // Convert data to CSV
  if (!data || data.length === 0) return;
  
  const keys = Object.keys(data[0]);
  const csvContent = [
    keys.join(','), // Headers
    ...data.map(row => 
      keys.map(key => {
        const value = row[key];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}.csv`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
}