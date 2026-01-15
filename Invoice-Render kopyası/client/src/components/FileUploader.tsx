import { useState, useRef } from "react";
import { Upload, FileType, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  error?: string;
}

export function FileUploader({ onFileSelect, selectedFiles, error }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      validateAndSelect(files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      validateAndSelect(files);
    }
  };

  const validateAndSelect = (files: File[]) => {
    const valid = files.filter(
      (file) =>
        file.type === "text/xml" ||
        file.name.endsWith(".xml") ||
        file.type === "application/pdf" ||
        file.name.endsWith(".pdf")
    );
    if (valid.length) {
      onFileSelect(valid);
    } else {
      alert("Please upload a valid XML or PDF file.");
    }
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ease-out",
        isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-card hover:border-primary/50 hover:bg-accent/50",
        error ? "border-destructive/50 bg-destructive/5" : "",
        "h-64 flex flex-col items-center justify-center p-8 text-center"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept=".xml,.pdf"
        multiple
        onChange={handleChange}
      />

      <div className={cn(
        "w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-colors duration-300",
        selectedFiles.length ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary group-hover:bg-primary/20"
      )}>
        {selectedFiles.length ? (
          <CheckCircle className="w-8 h-8" />
        ) : (
          <Upload className="w-8 h-8" />
        )}
      </div>

      <h3 className="text-xl font-bold font-display text-foreground mb-2">
        {selectedFiles.length ? "Files Selected" : "Upload XML or PDF"}
      </h3>
      
      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
        {selectedFiles.length ? (
          <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded">
            {selectedFiles.length === 1
              ? selectedFiles[0].name
              : `${selectedFiles.length} files selected`}
          </span>
        ) : (
          "Drag and drop your XML or PDF file here, or click to browse."
        )}
      </p>

      {!selectedFiles.length && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
          <FileType className="w-4 h-4" />
          <span>Supports XML and PDF invoices</span>
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 flex items-center gap-2 text-destructive text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
