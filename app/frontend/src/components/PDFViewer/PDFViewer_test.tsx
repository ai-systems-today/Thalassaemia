import React, { useState } from "react";
import { Document, Page } from "react-pdf";
import { useSearchParams } from "react-router-dom";
import * as pdfjs from "pdfjs-dist/build/pdf";
import "pdfjs-dist/build/pdf.worker.entry";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.worker.min.js`;

interface PDFViewerProps {
    pdfUrl: string; // Accept pdfUrl as a prop
}


const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                <Page pageNumber={pageNumber} />
            </Document>
            <div>
                <button disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>Previous</button>
                <span> Page {pageNumber} of {numPages} </span>
                <button disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(pageNumber + 1)}>Next</button>
            </div>
        </div>
    );
};

export default PDFViewer;

