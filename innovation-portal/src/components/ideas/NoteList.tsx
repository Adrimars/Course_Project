'use client';

import { useState, useEffect } from 'react';
import { NoteType } from '@/types';
import { NoteForm } from './NoteForm';
import { formatDate } from '@/lib/utils';

interface NoteInfo {
  id: string;
  content: string;
  type: NoteType;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string };
}

interface NoteListProps {
  ideaId: string;
  currentUserId: string;
  canCollaborate: boolean;
}

export function NoteList({ ideaId, currentUserId, canCollaborate }: NoteListProps) {
  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/ideas/${ideaId}/notes`);
        if (!res.ok) throw new Error('Failed to load notes');
        const data: NoteInfo[] = await res.json();
        setNotes(data);
      } catch {
        setError('Could not load notes.');
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [ideaId]);

  const handleNoteAdded = (newNote: NoteInfo) => {
    setNotes((prev) => [...prev, newNote]);
  };

  return (
    <section aria-labelledby="notes-heading" className="mt-8">
      <h2
        id="notes-heading"
        className="mb-4 text-base font-semibold text-gray-900"
      >
        Notes{notes.length > 0 && <span className="ml-1 text-sm font-normal text-gray-400">({notes.length})</span>}
      </h2>

      {loading && (
        <p className="text-sm text-gray-400">Loading notes…</p>
      )}

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && notes.length === 0 && (
        <p className="text-sm text-gray-400">No notes yet. Add the first one below.</p>
      )}

      {/* Notes list */}
      {notes.length > 0 && (
        <ul className="mb-4 space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className={`rounded-lg border px-4 py-3 ${
                note.type === 'COLLABORATIVE'
                  ? 'border-blue-100 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    note.type === 'COLLABORATIVE'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {note.type === 'COLLABORATIVE' ? 'Collaborative' : 'Personal'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <span>{note.user.id === currentUserId ? 'You' : note.user.name}</span>
                <span>·</span>
                <span>{formatDate(note.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add note form */}
      <NoteForm
        ideaId={ideaId}
        canCollaborate={canCollaborate}
        onNoteAdded={handleNoteAdded}
      />
    </section>
  );
}
