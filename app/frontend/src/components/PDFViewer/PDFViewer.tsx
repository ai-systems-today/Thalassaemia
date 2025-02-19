import React, { useState, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import "pdfjs-dist/build/pdf.worker.entry";

// ✅ Fix PDF.js worker issue
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.worker.min.js`;

interface PDFViewerProps {
    pdfUrl: string;
}

// ✅ Detect Mobile Device
const isMobile = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(isMobile() ? 0.8 : 1.2);
    const pdfWrapperRef = useRef<HTMLDivElement>(null);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    // ✅ Enable touch gestures for zooming
    useEffect(() => {
        const wrapper = pdfWrapperRef.current;
        if (!wrapper || !isMobile()) return;

        let scaleFactor = scale;
        let startDist = 0;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                startDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const newDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                const delta = newDist - startDist;

                if (Math.abs(delta) > 5) {
                    scaleFactor += delta * 0.002; // Adjust zoom sensitivity
                    scaleFactor = Math.max(0.6, Math.min(scaleFactor, 2)); // Clamp zoom
                    setScale(scaleFactor);
                }
                startDist = newDist;
            }
        };

        wrapper.addEventListener("touchstart", handleTouchStart);
        wrapper.addEventListener("touchmove", handleTouchMove);

        return () => {
            wrapper.removeEventListener("touchstart", handleTouchStart);
            wrapper.removeEventListener("touchmove", handleTouchMove);
        };
    }, []);

    return (
        <div ref={pdfWrapperRef} style={{ textAlign: "center", padding: "10px", overflow: "hidden" }}>
            <div style={{ overflowX: "scroll", maxWidth: "100%", maxHeight: "90vh" }}>
                <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                    <Page pageNumber={pageNumber} scale={scale} />
                </Document>
            </div>

            {/* ✅ Zoom controls */}
            <div style={{ marginTop: "10px" }}>
                <button onClick={() => setScale(scale - 0.2)} disabled={scale <= 0.6}>➖ Zoom Out</button>
                <button onClick={() => setScale(scale + 0.2)} disabled={scale >= 2}>➕ Zoom In</button>
            </div>

            {/* ✅ Page navigation */}
            <div>
                <button disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>⬅ Previous</button>
                <span> Page {pageNumber} of {numPages} </span>
                <button disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(pageNumber + 1)}>➡ Next</button>
            </div>
        </div>
    );
};

export default PDFViewer;



