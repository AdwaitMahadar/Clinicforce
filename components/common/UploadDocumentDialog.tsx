"use client";

/**
 * Presigned PUT upload + confirmDocumentUpload metadata — shared by patient and appointment detail.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  uploadDocumentDialogSchema,
  type UploadDocumentDialogValues,
} from "@/lib/validators/document";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "@/lib/constants/document";
import {
  getUploadPresignedUrl,
  confirmDocumentUpload,
} from "@/lib/actions/documents";

export interface UploadDocumentDialogProps {
  patientId: string; 
  appointmentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentDialog({
  patientId,
  appointmentId,
  open,
  onOpenChange,
}: UploadDocumentDialogProps) {
  const router = useRouter();

  const form = useForm<UploadDocumentDialogValues>({
    resolver: zodResolver(uploadDocumentDialogSchema),
    defaultValues: {
      file: undefined,
      type: "other",
      title: "",
      description: "",
    },
    mode: "onSubmit",
  });

  const { control, handleSubmit, reset, register, formState } = form;

  useEffect(() => {
    if (open) {
      reset({
        file: undefined,
        type: "other",
        title: "",
        description: "",
      });
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const file = values.file;
    if (!(file instanceof File)) return;

    const presign = await getUploadPresignedUrl({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      assignedToType: "patient", // TODO: make dynamic when user document uploads are supported (schema already handles "patient" | "user")
      assignedToId: patientId,
      ...(appointmentId ? { appointmentId } : {}),
    });

    if (!presign.success) {
      toast.error(presign.error ?? "Could not start upload.");
      return;
    }

    const { uploadUrl, fileKey } = presign.data;

    let putRes: Response;
    try {
      putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
    } catch {
      toast.error("Upload to storage failed. Try again.");
      return;
    }

    if (!putRes.ok) {
      toast.error("Upload to storage failed. Try again.");
      return;
    }

    const titleTrim = values.title?.trim();
    const confirm = await confirmDocumentUpload({
      fileKey,
      fileName:       file.name,
      fileSize:       file.size,
      mimeType:       file.type,
      title:          titleTrim || undefined,
      type:           values.type,
      assignedToId:   patientId, 
      assignedToType: "patient", // TODO: make dynamic when user document uploads are supported (schema already handles "patient" | "user")
      ...(appointmentId ? { appointmentId } : {}),
      description: values.description?.trim() || undefined,
    });

    if (!confirm.success) {
      toast.error(
        confirm.error ??
          "Document uploaded but metadata was not saved. The file may remain in storage without a record."
      );
      return;
    }

    toast.success("Document uploaded.");
    onOpenChange(false);
  });

  const handleDialogOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-text-primary)" }}>
            Upload document
          </DialogTitle>
          <DialogDescription>
            PDF or image up to 10 MB. The file is sent directly to storage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doc-file">File</Label>
            <Controller
              name="file"
              control={control}
              render={({ field }) => (
                <Input
                  key={open ? "doc-file-open" : "doc-file-closed"}
                  id="doc-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  className="cursor-pointer"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    field.onChange(f);
                  }}
                />
              )}
            />
            {formState.errors.file && (
              <p className="text-xs" style={{ color: "var(--color-red)" }}>
                {formState.errors.file.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Document type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {DOCUMENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-title">Title (optional)</Label>
            <Input
              id="doc-title"
              placeholder="Defaults to file name"
              {...register("title")}
              style={{
                background: "var(--color-surface-alt)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-desc">Description (optional)</Label>
            <Textarea
              id="doc-desc"
              rows={3}
              {...register("description")}
              placeholder="Notes for your team"
              style={{
                background: "var(--color-surface-alt)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
