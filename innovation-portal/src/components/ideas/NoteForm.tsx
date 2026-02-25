'use client';

import { useState } from 'react';
import { NoteType } from '@/types';
import { Button } from '@/components/ui/Button';

interface NoteFormProps {
  ideaId: string;
  canCollaborate: boolean; // Whether the user can create COLLABORATIVE notes
  onNoteAdded: (note: NoteInfo) => void;
}

interface NoteInfo {
  id: string;
  content: string;
  type: NoteType;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string };
}

export function NoteForm({ ideaId, canCollaborate, onNoteAdded }: NoteFormProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'PERSONAL' | 'COLLABORATIVE'>('PERSONAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/ideas/${ideaId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), type }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add note');
        return;
      }

      const newNote: NoteInfo = await res.json();
      onNoteAdded(newNote);
      setContent('');
      setType('PERSONAL');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = content.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          maxLength={5000}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          aria-label="Note content"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {charCount}/5000
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Note type toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="radio"
              name={`note-type-${ideaId}`}
              value="PERSONAL"
              checked={type === 'PERSONAL'}
              onChange={() => setType('PERSONAL')}
              className="text-blue-600"
            />
            Personal (only you)
          </label>
          {canCollaborate && (
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="radio"
                name={`note-type-${ideaId}`}
                value="COLLABORATIVE"
                checked={type === 'COLLABORATIVE'}
                onChange={() => setType('COLLABORATIVE')}
                className="text-blue-600"
              />
              Collaborative (visible to team)
            </label>
          )}
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? 'Adding…' : 'Add Note'}
        </Button>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </form>
  );
}
