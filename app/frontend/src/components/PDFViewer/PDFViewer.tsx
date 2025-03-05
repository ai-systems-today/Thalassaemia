import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;

interface PdfViewerProps {
  pdfUrl: string;
  initialPage?: number;
  height?: string;
}

const PdfViewer = ({ pdfUrl, initialPage = 1, height = 'auto' }: PdfViewerProps) => {
  // Extract base URL and page number from the pdfUrl
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [width, setWidth] = useState(window.innerWidth * 0.95);
  
  // Parse the PDF URL to extract page number when component mounts
  useEffect(() => {
    const parseUrl = () => {
      // Check if URL has a #page= parameter
      const hashPageMatch = pdfUrl.match(/#page=(\d+)/);
      
      if (hashPageMatch && hashPageMatch[1]) {
        // Parse the page number
        const pageFromUrl = parseInt(hashPageMatch[1], 10);
        setPageNumber(pageFromUrl);
        
        // Get the base URL by removing the #page part
        const baseUrlPart = pdfUrl.split('#')[0];
        setBaseUrl(baseUrlPart);
      } else {
        // No page specified in URL
        setPageNumber(initialPage);
        setBaseUrl(pdfUrl);
      }
    };
    
    parseUrl();
  }, [pdfUrl, initialPage]);
  
  // Responsive width adjustment
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth > 768 
        ? window.innerWidth * 0.8
        : window.innerWidth * 0.95);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="pdf-container" style={{ height }}>
      <Document
        file={baseUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div className="loading">Loading PDF...</div>}
        error={<div className="error">Failed to load PDF. Please try again later.</div>}
      >
        <Page 
          pageNumber={pageNumber} 
          width={width}
          renderTextLayer={false}
        />
      </Document>
      
      {/* Mobile-friendly navigation controls */}
      <div className="controls" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        padding: '10px',
        background: '#f0f0f0',
        position: 'sticky',
        bottom: 0
      }}>
        <button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(prev => prev - 1)}
          style={{ padding: '8px 16px', fontSize: '16px' }}
        >
          Previous
        </button>
        
        <span style={{ display: 'flex', alignItems: 'center' }}>
          Page {pageNumber} of {numPages || '--'}
        </span>
        
        <button
          disabled={numPages === null || pageNumber >= numPages}
          onClick={() => setPageNumber(prev => prev + 1)}
          style={{ padding: '8px 16px', fontSize: '16px' }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PdfViewer;


