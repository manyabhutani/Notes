import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Notebook as NotebookIcon } from 'lucide-react';
import { db } from '../db/db';
import '../styles/App.css';

interface LibraryProps {
  onOpenNotebook: (id: number) => void;
}

const Library: React.FC<LibraryProps> = ({ onOpenNotebook }) => {
  const notebooks = useLiveQuery(() => db.notebooks.orderBy('createdAt').reverse().toArray());
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const addNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const colors = ['#6d8e8e', '#8e6d6d', '#8e8e6d', '#6d6d8e', '#8e7a6d'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    await db.notebooks.add({
      title: newTitle,
      coverColor: randomColor,
      createdAt: Date.now(),
    });

    setNewTitle('');
    setIsAdding(false);
  };

  return (
    <div className="library-container">
      <header className="header">
        <h1>Manya's Folder</h1>
        {!isAdding ? (
          <button className="add-btn" onClick={() => setIsAdding(true)}>
            <Plus size={20} />
            New Notebook
          </button>
        ) : (
          <form onSubmit={addNotebook} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Notebook name..."
              className="add-notebook-input"
              style={{ padding: '8px 16px', borderRadius: '50px', border: '1px solid #ddd' }}
            />
            <button type="submit" className="add-btn">Add</button>
            <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '8px 16px' }}>Cancel</button>
          </form>
        )}
      </header>

      <div className="notebook-grid">
        {notebooks?.map((notebook) => (
          <div
            key={notebook.id}
            className="notebook-card"
            onClick={() => notebook.id && onOpenNotebook(notebook.id)}
          >
            <div className="notebook-cover" style={{ backgroundColor: notebook.coverColor }}>
              <NotebookIcon color="white" size={48} strokeWidth={1} />
            </div>
            <p className="notebook-title">{notebook.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Library;
