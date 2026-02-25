'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ideaSubmitSchema, IdeaSubmitInput } from '@/lib/validations/idea';
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

/**
 * T027 / spec US2: Multi-field idea submission form.
 * Includes client-side validation and file pre-check (type + size).
 */
export function IdeaSubmitForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof ideaSubmitSchema>, unknown, IdeaSubmitInput>({
    resolver: zodResolver(ideaSubmitSchema),
    defaultValues: { visibility: 'PUBLIC' },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    setSelectedFile(null);

    if (!file) return;

    // spec CHK021: Client-side size guard
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File is too large (${formatFileSize(file.size)}). Maximum is 10 MB.`);
      e.target.value = '';
      return;
    }

    // Client-side MIME type pre-check
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
    if (selectedFile) {
      formData.append('attachment', selectedFile);
    }

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 201) {
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="title" required>
          Idea Title
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="Summarise your idea in 10–200 characters"
          error={errors.title?.message}
          {...register('title')}
        />
        {/* spec CHK031: US2 scenario 7 — inline validation for title min 10 chars */}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description" required>
          Description
        </Label>
        <textarea
          id="description"
          rows={6}
          placeholder="Describe your idea in at least 50 characters..."
          aria-describedby={errors.description ? 'description-error' : undefined}
          aria-invalid={!!errors.description}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500'
          }`}
          {...register('description')}
        />
        {errors.description && (
          <p id="description-error" className="mt-1 text-xs text-red-600">
            {/* spec CHK031: inline validation error for description < 50 chars */}
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1">
        <Label htmlFor="category" required>
          Category
        </Label>
        <select
          id="category"
          aria-describedby={errors.category ? 'category-error' : undefined}
          aria-invalid={!!errors.category}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.category
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500'
          }`}
          {...register('category')}
        >
          <option value="">Select a category…</option>
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p id="category-error" className="text-xs text-red-600">
            {errors.category.message}
          </p>
        )}
      </div>

      {/* Visibility */}
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-gray-700">
          Visibility
        </legend>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="PUBLIC"
              className="text-blue-600"
              {...register('visibility')}
            />
            Public — visible to all users
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="PRIVATE"
              className="text-blue-600"
              {...register('visibility')}
            />
            Private — only you and admins
          </label>
        </div>
      </fieldset>

      {/* File attachment */}
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
        {fileError && (
          <p id="file-error" className="text-xs text-red-600">
            {fileError}
          </p>
        )}
        {selectedFile && !fileError && (
          <p className="text-xs text-gray-500">
            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        )}
      </div>

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        Submit Idea
      </Button>
    </form>
  );
}
