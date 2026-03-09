import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Library from './components/Library';
import NotebookViewer from './components/NotebookViewer';
import './styles/App.css';

const App: React.FC = () => {
  const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null);

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {activeNotebookId === null ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Library onOpenNotebook={setActiveNotebookId} />
          </motion.div>
        ) : (
          <motion.div
            key="notebook"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <NotebookViewer
              notebookId={activeNotebookId}
              onBack={() => setActiveNotebookId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
