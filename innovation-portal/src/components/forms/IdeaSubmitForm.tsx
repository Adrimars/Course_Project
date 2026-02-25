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

// Phase 3: expanded limits
const MAX_FILE_SIZE      = 10 * 1024 * 1024;  // 10 MB per file
const MAX_AGGREGATE_SIZE = 50 * 1024 * 1024;  // 50 MB total
const MAX_FILES          = 5;
const MAX_VIDEO_LINKS    = 3;

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  // Phase 3 additions
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
];

const CATEGORY_OPTIONS = [
  { value: 'TECHNOLOGY',          label: 'Technology' },
  { value: 'PROCESS',             label: 'Process Improvement' },
  { value: 'PRODUCT',             label: 'Product' },
  { value: 'COST_SAVING',         label: 'Cost Saving' },
  { value: 'CUSTOMER_EXPERIENCE', label: 'Customer Experience' },
  { value: 'OTHER',               label: 'Other' },
];

const AUTOSAVE_KEY = 'idea-form-draft';

// Phase 4: Optional props for draft edit mode
interface IdeaSubmitFormProps {
  /** If set, form is in draft-edit mode — submits via PATCH instead of POST */
  draftId?: string;
  /** Pre-fill values when editing an existing draft */
  initialValues?: {
    title?: string;
    description?: string;
    category?: string;
    visibility?: string;
    metadata?: Record<string, string>;
    videoLinks?: Array<{ url: string; title: string }>;
  };
}

/**
 * Phase 2 — Smart Submission Form
 * Phase 3 — Multi-Media support: multiple file attachments + video links
 * Phase 4 — Draft Management: Save as Draft button + draft-edit mode
 */
export function IdeaSubmitForm({ draftId, initialValues }: IdeaSubmitFormProps = {}) {
  const router = useRouter();
  const { showToast } = useToast();

  // Phase 3: multi-file state
  const [fileErrors, setFileErrors]   = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Phase 3: video links state
  const [videoLinks, setVideoLinks] = useState<Array<{ url: string; title: string }>>([
    { url: '', title: '' },
  ]);
  const [videoLinkErrors, setVideoLinkErrors] = useState<string[]>([]);

  // Collapsible optional sections
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [videoLinksOpen, setVideoLinksOpen] = useState(false);

  const [serverError,    setServerError]    = useState<string | null>(null);
  const [isSavingDraft,  setIsSavingDraft]  = useState(false);
  // Phase 2: metadata key/value map for category-specific fields
  const [metadata,          setMetadata]       = useState<Record<string, string>>({});
  const [templateLoaded,    setTemplateLoaded] = useState(false);

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

  const titleValue       = watch('title')       ?? '';
  const descriptionValue = watch('description') ?? '';
  const selectedCategory = watch('category')    ?? '';

  // ── Initialize from initialValues (edit mode) or localStorage (create mode) ─
  useEffect(() => {
    // Phase 4: edit mode — pre-fill from server data
    if (draftId && initialValues) {
      if (initialValues.title)       setValue('title',       initialValues.title);
      if (initialValues.description) setValue('description', initialValues.description);
      if (initialValues.category)    setValue('category',    initialValues.category as never);
      if (initialValues.visibility)  setValue('visibility',  initialValues.visibility as never);
      if (initialValues.metadata)    setMetadata(initialValues.metadata);
      if (initialValues.videoLinks)  setVideoLinks(initialValues.videoLinks);
      return; // don't restore from localStorage in edit mode
    }
    // Create mode: restore auto-saved localStorage draft
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as {
        title?: string;       description?: string;
        category?: string;    visibility?: string;
        metadata?: Record<string, string>;
        videoLinks?: Array<{ url: string; title: string }>;
      };
      if (draft.title)       setValue('title',       draft.title);
      if (draft.description) setValue('description', draft.description);
      if (draft.category)    setValue('category',    draft.category as never);
      if (draft.visibility)  setValue('visibility',  draft.visibility as never);
      if (draft.metadata)    setMetadata(draft.metadata);
      if (draft.videoLinks)  setVideoLinks(draft.videoLinks);
    } catch { /* ignore corrupt drafts */ }
  }, [setValue]);

  // ── Auto-save: persist on form change ────────────────────────────────────
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        title:       titleValue,
        description: descriptionValue,
        category:    selectedCategory,
        visibility:  watch('visibility'),
        metadata,
        videoLinks,
      }));
    } catch { /* storage quota exceeded */ }
  }, [titleValue, descriptionValue, selectedCategory, watch, metadata, videoLinks]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  // ── Clear metadata + template flag when category changes ─────────────────
  useEffect(() => {
    setMetadata({});
    setTemplateLoaded(false);
  }, [selectedCategory]);

  const handleLoadTemplate = () => {
    const tpl = CATEGORY_TEMPLATES[selectedCategory];
    if (!tpl) return;
    setValue('title',       tpl.title,       { shouldValidate: true });
    setValue('description', tpl.description, { shouldValidate: true });
    setTemplateLoaded(true);
    showToast('Template loaded — customise it before submitting.', 'success');
  };

  const handleMetadataChange = (key: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  };

  // ── Phase 3: multi-file selection ────────────────────────────────────────
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileErrors([]);
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    const combined = [...selectedFiles, ...incoming];
    const errs: string[] = [];

    if (combined.length > MAX_FILES) {
      errs.push(`You may attach at most ${MAX_FILES} files.`);
      e.target.value = '';
      setFileErrors(errs);
      return;
    }

    for (const f of incoming) {
      if (f.size > MAX_FILE_SIZE) {
        errs.push(`"${f.name}" exceeds the 10 MB per-file limit (${formatFileSize(f.size)}).`);
      } else if (!ALLOWED_TYPES.includes(f.type)) {
        errs.push(`"${f.name}" is not an allowed file type.`);
      }
    }

    const totalSize = combined.reduce((s, f) => s + f.size, 0);
    if (totalSize > MAX_AGGREGATE_SIZE) {
      errs.push(`Total size (${formatFileSize(totalSize)}) exceeds the 50 MB per-idea limit.`);
    }

    if (errs.length > 0) {
      setFileErrors(errs);
      e.target.value = '';
      return;
    }

    setSelectedFiles(combined);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Phase 3: video link management ───────────────────────────────────────
  const handleVideoLinkChange = (index: number, field: 'url' | 'title', value: string) => {
    setVideoLinks((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
    setVideoLinkErrors([]);
  };

  const addVideoLink = () => {
    if (videoLinks.length < MAX_VIDEO_LINKS) {
      setVideoLinks((prev) => [...prev, { url: '', title: '' }]);
    }
  };

  const removeVideoLink = (index: number) => {
    setVideoLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Form submit ───────────────────────────────────────────────────────────
  const onSubmit = async (data: IdeaSubmitInput) => {
    setServerError(null);
    setVideoLinkErrors([]);

    // Validate video links client-side
    const filledLinks = videoLinks.filter((v) => v.url.trim() !== '');
    const ytPattern = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)/;
    const vmPattern = /^https?:\/\/(www\.)?vimeo\.com\/\d+/;
    const linkErrs: string[] = [];
    filledLinks.forEach((v, i) => {
      if (!ytPattern.test(v.url) && !vmPattern.test(v.url)) {
        linkErrs.push(`Video link ${i + 1}: only YouTube and Vimeo URLs are supported.`);
      }
    });
    if (linkErrs.length > 0) { setVideoLinkErrors(linkErrs); return; }

    const filteredMeta = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v.trim() !== '')
    );

    // Phase 4: Edit-mode (draft) submit — PATCH with submitDraft flag
    if (draftId) {
      try {
        const res = await fetch(`/api/ideas/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submitDraft: true,
            title:       data.title,
            description: data.description,
            category:    data.category,
            visibility:  data.visibility ?? 'PUBLIC',
            metadata:    Object.keys(filteredMeta).length > 0 ? filteredMeta : undefined,
            videoLinks:  filledLinks.length > 0 ? filledLinks : undefined,
          }),
        });
        if (res.ok) {
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
      return;
    }

    // Create mode — POST with multipart form data
    const formData = new FormData();
    formData.append('title',       data.title);
    formData.append('description', data.description);
    formData.append('category',    data.category);
    formData.append('visibility',  data.visibility ?? 'PUBLIC');

    // Phase 2: non-empty metadata
    if (Object.keys(filteredMeta).length > 0) {
      formData.append('metadata', JSON.stringify(filteredMeta));
    }

    // Phase 3: attachments (one field per file, field name 'attachments')
    for (const file of selectedFiles) {
      formData.append('attachments', file);
    }

    // Phase 3: video links
    if (filledLinks.length > 0) {
      formData.append('videoLinks', JSON.stringify(filledLinks));
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

  // ── Phase 4: Save as Draft ────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setServerError(null);
    setIsSavingDraft(true);

    const currentValues = watch();
    const filteredMeta = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v.trim() !== '')
    );
    const filledLinks = videoLinks.filter((v) => v.url.trim() !== '');

    try {
      if (draftId) {
        // Edit mode: PATCH draft fields via JSON
        const res = await fetch(`/api/ideas/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draft: {
              title:       currentValues.title,
              description: currentValues.description,
              category:    currentValues.category,
              visibility:  currentValues.visibility ?? 'PUBLIC',
              metadata:    Object.keys(filteredMeta).length > 0 ? filteredMeta : undefined,
              videoLinks:  filledLinks.length > 0 ? filledLinks : undefined,
            },
          }),
        });
        if (res.ok) {
          showToast('Draft updated!', 'success');
        } else {
          const body = await res.json();
          setServerError(body.error ?? 'Failed to update draft.');
        }
      } else {
        // Create mode: POST with isDraft=true
        const formData = new FormData();
        formData.append('title',       currentValues.title       ?? '');
        formData.append('description', currentValues.description ?? '');
        formData.append('category',    currentValues.category    ?? '');
        formData.append('visibility',  currentValues.visibility  ?? 'PUBLIC');
        formData.append('isDraft',     'true');

        if (Object.keys(filteredMeta).length > 0) {
          formData.append('metadata', JSON.stringify(filteredMeta));
        }
        for (const file of selectedFiles) {
          formData.append('attachments', file);
        }
        if (filledLinks.length > 0) {
          formData.append('videoLinks', JSON.stringify(filledLinks));
        }

        const res = await fetch('/api/ideas', { method: 'POST', body: formData });
        if (res.status === 201) {
          localStorage.removeItem(AUTOSAVE_KEY);
          showToast('Draft saved!', 'success');
          router.push('/my-ideas?tab=drafts');
        } else {
          const body = await res.json();
          setServerError(body.error ?? 'Failed to save draft.');
        }
      }
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsSavingDraft(false);
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

      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" required>Idea Title</Label>
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

      {/* ── Category ────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Label htmlFor="category" required>Category</Label>
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

      {/* ── Description ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" required>Description</Label>
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
          <p id="description-error" className="mt-1 text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* ── Phase 2: Category-specific dynamic fields ───────────────────────── */}
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

      {/* ── Visibility ────────────────────────────────────────────────────────── */}
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-gray-700">Visibility</legend>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="PUBLIC"  className="text-blue-600" {...register('visibility')} />
            Public — visible to all users
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="PRIVATE" className="text-blue-600" {...register('visibility')} />
            Private — only you and admins
          </label>
        </div>
      </fieldset>

      {/* ── Phase 3: Multiple file attachments (collapsible) ────────────────── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setAttachmentsOpen((v) => !v)}
          className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 focus:outline-none"
          aria-expanded={attachmentsOpen}
        >
          <span className="text-sm font-semibold text-gray-800">
            📎 Attachments
            <span className="ml-1.5 font-normal text-gray-500">(optional — up to {MAX_FILES} files)</span>
          </span>
          <span className="text-gray-400 text-xs">{attachmentsOpen ? '▲ Hide' : '▼ Add files'}</span>
        </button>

        {attachmentsOpen && (
          <div className="p-4 space-y-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Up to {MAX_FILES} files · 10 MB each · 50 MB total · Allowed: PDF, DOC, DOCX, PNG, JPEG, PPTX, XLSX, MP4
            </p>
            <input
              id="attachments"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.pptx,.xlsx,.mp4"
              onChange={handleFilesChange}
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-gray-700 hover:file:bg-gray-50"
              aria-describedby={fileErrors.length > 0 ? 'file-errors' : undefined}
              aria-invalid={fileErrors.length > 0}
              disabled={selectedFiles.length >= MAX_FILES}
            />
            {fileErrors.length > 0 && (
              <ul id="file-errors" className="space-y-1">
                {fileErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600">{err}</li>
                ))}
              </ul>
            )}
            {selectedFiles.length > 0 && (
              <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 overflow-hidden">
                {selectedFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 bg-white text-sm">
                    <span className="truncate mr-2 text-gray-700">{f.name}</span>
                    <span className="shrink-0 text-xs text-gray-400 mr-2">{formatFileSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-red-500 hover:text-red-700 text-xs"
                      aria-label={`Remove ${f.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Phase 3: Video links (collapsible) ───────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setVideoLinksOpen((v) => !v)}
          className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 focus:outline-none"
          aria-expanded={videoLinksOpen}
        >
          <span className="text-sm font-semibold text-gray-800">
            🎬 Video Links
            <span className="ml-1.5 font-normal text-gray-500">(optional — YouTube or Vimeo)</span>
          </span>
          <span className="text-gray-400 text-xs">{videoLinksOpen ? '▲ Hide' : '▼ Add links'}</span>
        </button>

        {videoLinksOpen && (
          <div className="p-4 space-y-3 border-t border-gray-200">
            {videoLinkErrors.length > 0 && (
              <ul className="space-y-1">
                {videoLinkErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600">{err}</li>
                ))}
              </ul>
            )}
            <div className="space-y-3">
              {videoLinks.map((link, i) => (
                <div key={i} className="rounded-md border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Video {i + 1}</span>
                    {videoLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVideoLink(i)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    id={`video-link-${i}`}
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
                    value={link.url}
                    onChange={(e) => handleVideoLinkChange(i, 'url', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Optional title for this video"
                    value={link.title}
                    onChange={(e) => handleVideoLinkChange(i, 'title', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={200}
                  />
                </div>
              ))}
            </div>
            {videoLinks.length < MAX_VIDEO_LINKS && (
              <button
                type="button"
                onClick={addVideoLink}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add another video link
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Auto-save indicator ──────────────────────────────────────────────── */}
      {!draftId && (titleValue.length > 0 || descriptionValue.length > 0) && (
        <p className="text-xs text-gray-400 text-right">Draft auto-saved locally</p>
      )}

      {/* ── Submit / Save buttons ────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={handleSaveDraft}
          isLoading={isSavingDraft}
          disabled={isSubmitting}
          className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          {draftId ? 'Update Draft' : 'Save as Draft'}
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSavingDraft}
          className="flex-1"
        >
          {draftId ? 'Submit Idea' : 'Submit Idea'}
        </Button>
      </div>
    </form>
  );
}
