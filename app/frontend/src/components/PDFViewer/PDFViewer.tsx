
import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "pdfjs-dist/build/pdf.worker.entry";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.worker.min.js`;

interface PDFViewerProps {
    pdfUrl: string;
}

// ✅ Detect Mobile
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(isMobile() ? 0.8 : 1.2);
    const pdfWrapperRef = useRef<HTMLDivElement>(null);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    // ✅ Fix: Explicitly force mobile browsers to use iframe
    if (isMobile()) {
        return (
            <div style={{ textAlign: "center", padding: "10px" }}>
                <iframe
                    src={pdfUrl}
                    width="100%"
                    height="600px"
                    style={{ border: "none" }}
                />
                <p>
                    If the PDF does not load,{" "}
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                        click here to open it in a new tab.
                    </a>
                </p>
            </div>
        );
    }

    return (
        <div ref={pdfWrapperRef} style={{ textAlign: "center", padding: "10px", overflow: "hidden" }}>
            <div style={{ overflowX: "scroll", maxWidth: "100%", maxHeight: "90vh" }}>
                <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                    <Page pageNumber={pageNumber} scale={scale} />
                </Document>
            </div>

            <div style={{ marginTop: "10px" }}>
                <button onClick={() => setScale(scale - 0.2)} disabled={scale <= 0.6}>➖ Zoom Out</button>
                <button onClick={() => setScale(scale + 0.2)} disabled={scale >= 2}>➕ Zoom In</button>
            </div>

            <div>
                <button disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>⬅ Previous</button>
                <span> Page {pageNumber} of {numPages} </span>
                <button disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(pageNumber + 1)}>➡ Next</button>
            </div>
        </div>
    );
};

export default PDFViewer;

