'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  ideaSubmitSchema,
  IdeaSubmitInput,
  CATEGORY_FIELDS,
  CATEGORY_TEMPLATES,
} from '@/lib/validations/idea';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/components/ui/Toast';
import { formatFileSize } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

const CATEGORY_OPTIONS = [
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'PROCESS', label: 'Process Improvement' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'COST_SAVING', label: 'Cost Saving' },
  { value: 'CUSTOMER_EXPERIENCE', label: 'Customer Experience' },
  { value: 'OTHER', label: 'Other' },
];

const AUTOSAVE_KEY = 'idea-form-draft';

/**
 * Phase 2 — Smart Submission Form
 * Features:
 *  - Character count indicators (title, description)
 *  - Dynamic category-specific fields per category selection
 *  - Field-level help text and examples per category
 *  - One-click "Load Template" per category
 *  - Auto-save draft to localStorage (cleared on successful submit)
 *  - Real-time validation feedback
 */
export function IdeaSubmitForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  // Phase 2: metadata state — key/value map for category-specific fields
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [templateLoaded, setTemplateLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof ideaSubmitSchema>, unknown, IdeaSubmitInput>({
    resolver: zodResolver(ideaSubmitSchema),
    defaultValues: { visibility: 'PUBLIC' },
    mode: 'onChange',
  });

  const titleValue = watch('title') ?? '';
  const descriptionValue = watch('description') ?? '';
  const selectedCategory = watch('category') ?? '';

  // ── Auto-save: restore draft on mount ────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as {
        title?: string;
        description?: string;
        category?: string;
        visibility?: string;
        metadata?: Record<string, string>;
      };
      if (draft.title) setValue('title', draft.title);
      if (draft.description) setValue('description', draft.description);
      if (draft.category) setValue('category', draft.category as never);
      if (draft.visibility) setValue('visibility', draft.visibility as never);
      if (draft.metadata) setMetadata(draft.metadata);
    } catch {
      // ignore corrupt drafts
    }
  }, [setValue]);

  // ── Auto-save: persist on form change ────────────────────────────────────
  const saveDraft = useCallback(() => {
    const title = titleValue;
    const description = descriptionValue;
    const category = selectedCategory;
    const visibility = watch('visibility');
    try {
      localStorage.setItem(
        AUTOSAVE_KEY,
        JSON.stringify({ title, description, category, visibility, metadata })
      );
    } catch {
      // storage quota exceeded — ignore
    }
  }, [titleValue, descriptionValue, selectedCategory, watch, metadata]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  // ── Clear metadata when category changes ────────────────────────────────
  useEffect(() => {
    setMetadata({});
    setTemplateLoaded(false);
  }, [selectedCategory]);

  // ── Load template for selected category ──────────────────────────────────
  const handleLoadTemplate = () => {
    const tpl = CATEGORY_TEMPLATES[selectedCategory];
    if (!tpl) return;
    setValue('title', tpl.title, { shouldValidate: true });
    setValue('description', tpl.description, { shouldValidate: true });
    setTemplateLoaded(true);
    showToast('Template loaded — customise it before submitting.', 'success');
  };

  // ── Category metadata field change ────────────────────────────────────────
  const handleMetadataChange = (key: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    setSelectedFile(null);
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File is too large (${formatFileSize(file.size)}). Maximum is 10 MB.`);
      e.target.value = '';
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('File type not allowed. Use PDF, DOC, DOCX, PNG, or JPEG.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const onSubmit = async (data: IdeaSubmitInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('visibility', data.visibility ?? 'PUBLIC');
    // Phase 2: attach non-empty metadata
    const filteredMeta = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v.trim() !== '')
    );
    if (Object.keys(filteredMeta).length > 0) {
      formData.append('metadata', JSON.stringify(filteredMeta));
    }
    if (selectedFile) {
      formData.append('attachment', selectedFile);
    }

    try {
      const res = await fetch('/api/ideas', { method: 'POST', body: formData });
      if (res.status === 201) {
        localStorage.removeItem(AUTOSAVE_KEY);
        showToast('Idea submitted successfully!', 'success');
        router.push('/dashboard');
        return;
      }
      const body = await res.json();
      setServerError(body.error ?? 'Submission failed. Please try again.');
    } catch {
      setServerError('Network error. Please try again.');
    }
  };

  const categoryFields = CATEGORY_FIELDS[selectedCategory] ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* ── Title ─────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" required>
            Idea Title
          </Label>
          {/* Phase 2: character count */}
          <span className={`text-xs ${titleValue.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
            {titleValue.length}/200
          </span>
        </div>
        <Input
          id="title"
          type="text"
          placeholder="Summarise your idea in 10–200 characters"
          error={errors.title?.message}
          {...register('title')}
        />
      </div>

      {/* ── Category (before description so template hint appears in time) ── */}
      <div className="space-y-1">
        <Label htmlFor="category" required>
          Category
        </Label>
        <div className="flex gap-2">
          <select
            id="category"
            aria-describedby={errors.category ? 'category-error' : undefined}
            aria-invalid={!!errors.category}
            className={`flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.category ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            {...register('category')}
          >
            <option value="">Select a category…</option>
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {/* Phase 2: Load template button */}
          {selectedCategory && (
            <button
              type="button"
              onClick={handleLoadTemplate}
              className="shrink-0 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Load a starter template for this category"
            >
              {templateLoaded ? '✓ Template loaded' : 'Load template'}
            </button>
          )}
        </div>
        {errors.category && (
          <p id="category-error" className="text-xs text-red-600">{errors.category.message}</p>
        )}
      </div>

      {/* ── Description ───────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" required>
            Description
          </Label>
          {/* Phase 2: character count */}
          <span className={`text-xs ${descriptionValue.length > 5000 ? 'text-red-500' : 'text-gray-400'}`}>
            {descriptionValue.length}/5000
          </span>
        </div>
        <textarea
          id="description"
          rows={6}
          placeholder="Describe your idea in at least 50 characters…"
          aria-describedby={errors.description ? 'description-error' : undefined}
          aria-invalid={!!errors.description}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
          {...register('description')}
        />
        {errors.description && (
          <p id="description-error" className="mt-1 text-xs text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* ── Phase 2: Category-specific dynamic fields ─────────────────────── */}
      {categoryFields.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {CATEGORY_OPTIONS.find((c) => c.value === selectedCategory)?.label} Details
          </p>
          {categoryFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <label htmlFor={`meta-${field.key}`} className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={`meta-${field.key}`}
                  rows={3}
                  placeholder={field.placeholder}
                  value={metadata[field.key] ?? ''}
                  onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : field.type === 'select' ? (
                <select
                  id={`meta-${field.key}`}
                  value={metadata[field.key] ?? ''}
                  onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select…</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`meta-${field.key}`}
                  type="text"
                  placeholder={field.placeholder}
                  value={metadata[field.key] ?? ''}
                  onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Visibility ────────────────────────────────────────────────────── */}
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-gray-700">Visibility</legend>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="PUBLIC" className="text-blue-600" {...register('visibility')} />
            Public — visible to all users
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="PRIVATE" className="text-blue-600" {...register('visibility')} />
            Private — only you and admins
          </label>
        </div>
      </fieldset>

      {/* ── File attachment ───────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Label htmlFor="attachment">
          Attachment (optional — PDF, DOC, DOCX, PNG, JPEG; max 10 MB)
        </Label>
        <input
          id="attachment"
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-gray-700 hover:file:bg-gray-50"
          aria-describedby={fileError ? 'file-error' : undefined}
          aria-invalid={!!fileError}
        />
        {fileError && <p id="file-error" className="text-xs text-red-600">{fileError}</p>}
        {selectedFile && !fileError && (
          <p className="text-xs text-gray-500">
            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        )}
      </div>

      {/* ── Auto-save indicator ───────────────────────────────────────────── */}
      {(titleValue.length > 0 || descriptionValue.length > 0) && (
        <p className="text-xs text-gray-400 text-right">Draft auto-saved</p>
      )}

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        Submit Idea
      </Button>
    </form>
  );
}
