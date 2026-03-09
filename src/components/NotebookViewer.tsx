import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Pen, Type, StickyNote, FilePlus, Eraser, ChevronLeft, ChevronRight, Palette, LayoutGrid, Trash2, Plus } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { db } from '../db/db';
import { processPdf } from '../utils/pdfHelper';
import Canvas from './Canvas';
import '../styles/App.css';

// Initialize PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface NotebookViewerProps {
  notebookId: number;
  onBack: () => void;
}

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#0047AB' },
  { name: 'Red', value: '#D22B2B' },
  { name: 'Green', value: '#008000' },
  { name: 'Orange', value: '#FF8C00' },
  { name: 'Purple', value: '#800080' },
];

const NotebookViewer: React.FC<NotebookViewerProps> = ({ notebookId, onBack }) => {
  const notebook = useLiveQuery(() => db.notebooks.get(notebookId));
  const pages = useLiveQuery(() => db.pages.where({ notebookId }).sortBy('order'));
  
  const [viewMode, setViewMode] = useState<'grid' | 'canvas'>('grid');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'text' | 'sticky'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addBlankPage = async () => {
    const lastPage = pages?.[pages.length - 1];
    const order = lastPage ? lastPage.order + 1 : 1;
    await db.pages.add({ notebookId, order, type: 'blank' });
    if (viewMode === 'canvas' && pages) {
      setCurrentPageIndex(pages.length);
    }
  };

  const deletePage = async () => {
    if (!pages || pages.length === 0) return;
    const pageToDelete = pages[currentPageIndex];
    if (!pageToDelete.id) return;

    if (window.confirm('Are you sure you want to delete this page?')) {
      await db.pages.delete(pageToDelete.id);
      await db.annotations.where({ pageId: pageToDelete.id }).delete();
      
      const remainingPages = await db.pages.where({ notebookId }).sortBy('order');
      for (let i = 0; i < remainingPages.length; i++) {
        await db.pages.update(remainingPages[i].id!, { order: i + 1 });
      }

      if (currentPageIndex >= remainingPages.length && currentPageIndex > 0) {
        setCurrentPageIndex(remainingPages.length - 1);
      }
      
      if (remainingPages.length === 0) {
        setViewMode('grid');
      }
    }
  };

  const importPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lastPage = pages?.[pages.length - 1];
    const lastOrder = lastPage ? lastPage.order : 0;
    const newPages = await processPdf(file, notebookId, lastOrder);
    await db.pages.bulkAdd(newPages);
  };

  const openPage = (index: number) => {
    setCurrentPageIndex(index);
    setViewMode('canvas');
  };

  const currentPage = pages?.[currentPageIndex];

  return (
    <div className="notebook-viewer" style={{ overflow: 'hidden' }}>
      <header className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} className="back-btn"><ArrowLeft size={24} /></button>
          <button 
            onClick={() => setViewMode('grid')} 
            className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
          >
            <LayoutGrid size={20} />
          </button>
        </div>
        
        <h2>{notebook?.title || 'Notebook'}</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {viewMode === 'canvas' && (
            <>
              <button onClick={deletePage} className="icon-btn text-red" title="Delete Page">
                <Trash2 size={20} color="#e53e3e" />
              </button>
              <span style={{ fontSize: '14px', color: '#888', minWidth: '40px', textAlign: 'right' }}>
                {currentPageIndex + 1} / {pages?.length || 0}
              </span>
            </>
          )}
          {viewMode === 'grid' && (
             <button onClick={addBlankPage} className="add-btn-small">
               <Plus size={16} /> Page
             </button>
          )}
        </div>
      </header>

      <main className="canvas-area">
        {viewMode === 'grid' ? (
          <div className="grid-view-container">
            <div className="page-grid">
              {pages?.map((page, index) => (
                <div key={page.id} className="grid-page-item" onClick={() => openPage(index)}>
                  <div className="grid-page-preview">
                    {page.type === 'pdf' && page.pdfBlob ? (
                      <div className="thumb-canvas-wrap">
                        <Document file={page.pdfBlob}>
                          <Page 
                            pageNumber={page.pdfPageNumber} 
                            width={160} 
                            renderTextLayer={false} 
                            renderAnnotationLayer={false}
                          />
                        </Document>
                      </div>
                    ) : (
                      <div className="blank-paper-thumb">
                        <div className="paper-lines"></div>
                      </div>
                    )}
                    <div className="page-number-badge">{index + 1}</div>
                  </div>
                  <div className="grid-page-footer">Page {index + 1}</div>
                </div>
              ))}
              <button className="grid-page-item add-page-grid" onClick={addBlankPage}>
                <div className="grid-page-preview empty-preview">
                  <Plus size={32} color="#ccc" />
                </div>
                <div className="grid-page-footer">Add Page</div>
              </button>
            </div>
          </div>
        ) : (
          <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              className="nav-btn" 
              onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
              disabled={currentPageIndex === 0}
            >
              <ChevronLeft size={32} />
            </button>

            <div key={currentPage?.id} className="page-container">
              <div className="page-content">
                {currentPage?.type === 'pdf' && currentPage.pdfBlob && (
                  <Document file={currentPage.pdfBlob} loading="Loading PDF...">
                    <Page
                      pageNumber={currentPage.pdfPageNumber}
                      width={595}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                )}
                {currentPage?.type === 'blank' && (
                  <div style={{ height: '842px', width: '595px', backgroundColor: 'white' }}></div>
                )}
                {currentPage?.id && (
                  <Canvas pageId={currentPage.id} tool={currentTool} color={currentColor} />
                )}
              </div>
            </div>

            <button 
              className="nav-btn" 
              onClick={() => {
                if (pages && currentPageIndex < pages.length - 1) {
                  setCurrentPageIndex(currentPageIndex + 1);
                } else {
                  addBlankPage();
                }
              }}
            >
              <ChevronRight size={32} />
            </button>
          </div>
        )}
      </main>

      {viewMode === 'canvas' && (
        <div className="toolbar-container">
          {showColorPicker && (
            <div className="color-picker-bubble">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`color-swatch ${currentColor === c.value ? 'active' : ''}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => {
                    setCurrentColor(c.value);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          )}
          
          <nav className="toolbar">
            <button
              className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
              onClick={() => setCurrentTool('pen')}
            >
              <Pen size={20} />
            </button>
            
            <button
              className="tool-btn"
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{ color: currentColor }}
            >
              <Palette size={20} />
            </button>

            <button
              className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
              onClick={() => setCurrentTool('eraser')}
            >
              <Eraser size={20} />
            </button>
            
            <button
              className={`tool-btn ${currentTool === 'text' ? 'active' : ''}`}
              onClick={() => setCurrentTool('text')}
            >
              <Type size={20} />
            </button>
            
            <button
              className={`tool-btn ${currentTool === 'sticky' ? 'active' : ''}`}
              onClick={() => setCurrentTool('sticky')}
            >
              <StickyNote size={20} />
            </button>
            
            <div style={{ width: '1px', backgroundColor: '#ddd', margin: '5px 0' }}></div>
            
            <button className="tool-btn" onClick={() => fileInputRef.current?.click()}>
              <FilePlus size={20} />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={importPdf}
              accept=".pdf"
              style={{ display: 'none' }}
            />
          </nav>
        </div>
      )}
    </div>
  );
};

export default NotebookViewer;
